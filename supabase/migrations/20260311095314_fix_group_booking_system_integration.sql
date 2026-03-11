/*
  # Fix Group Booking System Integration

  1. Problem
    - booking_groups and group_sessions are two separate systems
    - The booking_groups trigger creates records but they're not shown in UI
    - The UI only shows group_sessions
    - Need to integrate these properly

  2. Solution
    - Create a trigger to automatically create group_sessions from booking_groups
    - Update assign_to_group_session function to work with null dates
    - Sync existing booking_groups to group_sessions

  3. Changes
    - Update assign_to_group_session to handle null preferred_date
    - Create trigger to sync booking_groups to group_sessions
    - Migrate existing booking_groups to group_sessions
*/

-- Drop and recreate the assign_to_group_session function to handle null dates
CREATE OR REPLACE FUNCTION assign_to_group_session()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_current_size integer;
BEGIN
  -- Only process if this is a group booking
  IF NEW.class_type = 'group' THEN
    -- Look for an existing group with same subject and session_type
    -- For subject-only bookings, we don't match on date/time
    SELECT bg.id, bg.current_group_size INTO v_group_id, v_current_size
    FROM booking_groups bg
    WHERE bg.subject = NEW.subject
      AND bg.session_type = NEW.session_type
      AND bg.status IN ('pending', 'approved')
      AND bg.current_group_size < bg.max_group_size
      -- Only match if both have null dates or both have same dates
      AND (
        (bg.preferred_date IS NULL AND NEW.preferred_date IS NULL)
        OR 
        (bg.preferred_date = NEW.preferred_date AND bg.preferred_time = NEW.preferred_time)
      )
    ORDER BY bg.created_at ASC
    LIMIT 1;

    -- If no suitable group found, create a new one
    IF v_group_id IS NULL THEN
      INSERT INTO booking_groups (
        subject,
        session_type,
        delivery_mode,
        preferred_date,
        preferred_time,
        status,
        current_group_size
      )
      VALUES (
        NEW.subject,
        NEW.session_type,
        COALESCE(NEW.delivery_mode, NEW.session_type),
        NEW.preferred_date,
        NEW.preferred_time,
        'pending',
        1
      )
      RETURNING id INTO v_group_id;
    ELSE
      -- Update the group size
      UPDATE booking_groups
      SET current_group_size = current_group_size + 1,
          updated_at = now()
      WHERE id = v_group_id;
    END IF;

    -- Assign the booking to the group
    NEW.group_id := v_group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/update group_session from booking_group
CREATE OR REPLACE FUNCTION sync_booking_group_to_group_session()
RETURNS TRIGGER AS $$
DECLARE
  v_group_session_id uuid;
  v_time_value time;
BEGIN
  -- Convert text time to time type, use NULL if conversion fails
  BEGIN
    v_time_value := NEW.preferred_time::time;
  EXCEPTION
    WHEN OTHERS THEN
      v_time_value := NULL;
  END;

  -- Check if a group_session already exists for this booking_group
  SELECT gs.id INTO v_group_session_id
  FROM group_sessions gs
  WHERE gs.id = NEW.id;

  IF v_group_session_id IS NULL AND NEW.preferred_date IS NOT NULL AND v_time_value IS NOT NULL THEN
    -- Create new group_session only if we have valid date and time
    INSERT INTO group_sessions (
      id,
      subject,
      session_type,
      preferred_date,
      preferred_time,
      status,
      min_students,
      max_students,
      current_count,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.subject,
      NEW.session_type,
      NEW.preferred_date,
      v_time_value,
      CASE 
        WHEN NEW.current_group_size >= 3 THEN 'ready'
        ELSE 'forming'
      END,
      3,  -- min_students
      50, -- max_students (matching new limit)
      NEW.current_group_size,
      NEW.created_at,
      NEW.updated_at
    );
    
    v_group_session_id := NEW.id;
  ELSIF v_group_session_id IS NOT NULL THEN
    -- Update existing group_session
    UPDATE group_sessions
    SET
      current_count = NEW.current_group_size,
      status = CASE 
        WHEN NEW.status = 'cancelled' THEN 'cancelled'::text
        WHEN NEW.current_group_size >= 3 THEN 'ready'::text
        ELSE 'forming'::text
      END,
      preferred_date = COALESCE(NEW.preferred_date, preferred_date),
      preferred_time = COALESCE(v_time_value, preferred_time),
      updated_at = NEW.updated_at
    WHERE id = v_group_session_id;
  END IF;

  -- Add participants to group_session_participants if group_session exists
  IF v_group_session_id IS NOT NULL THEN
    INSERT INTO group_session_participants (group_session_id, student_id, notes, joined_at, created_at)
    SELECT 
      v_group_session_id,
      b.student_id,
      b.notes,
      b.created_at,
      now()
    FROM bookings b
    WHERE b.group_id = NEW.id
      AND b.class_type = 'group'
      AND NOT EXISTS (
        SELECT 1 FROM group_session_participants gsp
        WHERE gsp.group_session_id = v_group_session_id
        AND gsp.student_id = b.student_id
      )
    ON CONFLICT (group_session_id, student_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync booking_groups to group_sessions
DROP TRIGGER IF EXISTS trigger_sync_booking_group_to_group_session ON booking_groups;
CREATE TRIGGER trigger_sync_booking_group_to_group_session
  AFTER INSERT OR UPDATE ON booking_groups
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_group_to_group_session();

-- Migrate existing booking_groups to group_sessions (only those with valid dates/times)
INSERT INTO group_sessions (
  id,
  subject,
  session_type,
  preferred_date,
  preferred_time,
  status,
  min_students,
  max_students,
  current_count,
  created_at,
  updated_at
)
SELECT 
  bg.id,
  bg.subject,
  bg.session_type,
  bg.preferred_date,
  bg.preferred_time::time,
  CASE 
    WHEN bg.current_group_size >= 3 THEN 'ready'
    ELSE 'forming'
  END,
  3,
  50,
  bg.current_group_size,
  bg.created_at,
  bg.updated_at
FROM booking_groups bg
WHERE bg.preferred_date IS NOT NULL 
  AND bg.preferred_time IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_sessions gs WHERE gs.id = bg.id
  )
ON CONFLICT (id) DO UPDATE SET
  current_count = EXCLUDED.current_count,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- Add participants from bookings to group_session_participants
INSERT INTO group_session_participants (group_session_id, student_id, notes, joined_at, created_at)
SELECT DISTINCT
  b.group_id,
  b.student_id,
  b.notes,
  b.created_at,
  now()
FROM bookings b
WHERE b.group_id IS NOT NULL
  AND b.class_type = 'group'
  AND EXISTS (SELECT 1 FROM group_sessions gs WHERE gs.id = b.group_id)
ON CONFLICT (group_session_id, student_id) DO NOTHING;
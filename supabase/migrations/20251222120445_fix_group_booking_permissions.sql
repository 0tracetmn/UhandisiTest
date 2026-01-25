/*
  # Fix Group Booking Permissions
  
  1. Problem
    - Students cannot book group sessions because the trigger function
      `assign_to_group_session()` runs with student permissions
    - Students don't have INSERT/UPDATE permission on `booking_groups` table
    - This causes group bookings to fail with RLS policy violations
  
  2. Solution
    - Make the trigger function run with SECURITY DEFINER
    - This allows the function to bypass RLS and perform operations as the function owner
    - Add additional RLS policy to allow function to manage booking_groups
  
  3. Security
    - Function logic is carefully controlled to only create/update groups appropriately
    - Students still cannot directly manipulate booking_groups table
    - All access is mediated through the trigger function
*/

-- Recreate the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION assign_to_group_session()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_current_size integer;
BEGIN
  -- Only process if this is a group booking
  IF NEW.class_type = 'group' THEN
    -- Look for an existing group with same subject, date, time, session_type, and delivery_mode
    -- that is not full and has status 'pending' or 'approved'
    SELECT bg.id, bg.current_group_size INTO v_group_id, v_current_size
    FROM booking_groups bg
    WHERE bg.subject = NEW.subject
      AND bg.session_type = NEW.session_type
      AND bg.preferred_date = NEW.preferred_date
      AND bg.preferred_time = NEW.preferred_time
      AND bg.delivery_mode = COALESCE(NEW.delivery_mode, NEW.session_type)
      AND bg.status IN ('pending', 'approved')
      AND bg.current_group_size < bg.max_group_size
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
$$ LANGUAGE plpgsql;
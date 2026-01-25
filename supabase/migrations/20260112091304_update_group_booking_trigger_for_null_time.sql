/*
  # Update Group Booking Trigger to Handle Null Time

  1. Changes
    - Update `assign_to_group_session()` function to handle null preferred_time
    - Group bookings with null time should match other bookings with null time
    - Use IS NOT DISTINCT FROM for proper null comparison

  2. Reasoning
    - Group sessions without assigned time should be grouped together
    - SQL NULL comparisons need special handling
    - This allows students to join the same group session even without a time set
*/

-- Update the function to handle null preferred_time
CREATE OR REPLACE FUNCTION assign_to_group_session()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_current_size integer;
BEGIN
  -- Only process if this is a group booking
  IF NEW.class_type = 'group' THEN
    -- Look for an existing group with same subject, date, session_type, and delivery_mode
    -- Use IS NOT DISTINCT FROM for null-safe comparison of preferred_time
    SELECT bg.id, bg.current_group_size INTO v_group_id, v_current_size
    FROM booking_groups bg
    WHERE bg.subject = NEW.subject
      AND bg.session_type = NEW.session_type
      AND bg.preferred_date = NEW.preferred_date
      AND bg.preferred_time IS NOT DISTINCT FROM NEW.preferred_time
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

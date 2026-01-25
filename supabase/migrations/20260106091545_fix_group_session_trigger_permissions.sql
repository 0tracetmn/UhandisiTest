/*
  # Fix Group Session Trigger Permissions

  1. Changes
    - Add SECURITY DEFINER to update_group_session_count function
    - This allows the trigger to update group_sessions table even when
      called by students who don't have direct UPDATE permissions
  
  2. Notes
    - The function now runs with the permissions of the function owner (postgres)
    - This is necessary because students need to be able to join group sessions
      but shouldn't have direct UPDATE access to the group_sessions table
*/

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_group_session_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_sessions
    SET 
      current_count = current_count + 1,
      status = CASE
        WHEN current_count + 1 >= min_students AND status = 'forming' THEN 'ready'
        WHEN current_count + 1 >= max_students THEN 'full'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.group_session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_sessions
    SET 
      current_count = GREATEST(current_count - 1, 0),
      status = CASE
        WHEN current_count - 1 < min_students AND status IN ('ready', 'full') THEN 'forming'
        ELSE status
      END,
      updated_at = now()
    WHERE id = OLD.group_session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
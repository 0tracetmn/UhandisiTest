/*
  # Disable RLS in Helper Functions

  1. Problem
    - SECURITY DEFINER functions do NOT automatically bypass RLS in PostgreSQL
    - The user_in_conversation function still triggers RLS on chat_participants
    - This causes infinite recursion when checking policies

  2. Solution
    - Add `SET row_security = off` to all helper functions
    - This explicitly disables RLS for queries within these functions

  3. Security
    - Safe because these functions only check membership/permissions
    - Functions are SECURITY DEFINER so they run with elevated privileges
    - No sensitive data is exposed beyond what the calling user should access
*/

-- Fix user_in_conversation to bypass RLS
CREATE OR REPLACE FUNCTION user_in_conversation(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM chat_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$;

-- Fix create_booking_conversation to bypass RLS
CREATE OR REPLACE FUNCTION create_booking_conversation(p_booking_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id uuid;
  v_student_id uuid;
  v_tutor_id uuid;
  v_status text;
BEGIN
  SELECT student_id, tutor_id, status
  INTO v_student_id, v_tutor_id, v_status
  FROM bookings
  WHERE id = p_booking_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Booking does not have an assigned tutor';
  END IF;

  IF v_status NOT IN ('approved', 'assigned', 'completed') THEN
    RAISE EXCEPTION 'Booking must be approved or assigned to create chat';
  END IF;

  IF auth.uid() NOT IN (v_student_id, v_tutor_id) THEN
    RAISE EXCEPTION 'Not authorized to create conversation for this booking';
  END IF;

  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE booking_id = p_booking_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO chat_conversations (booking_id)
  VALUES (p_booking_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO chat_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, v_student_id),
    (v_conversation_id, v_tutor_id);

  RETURN v_conversation_id;
END;
$$;

-- Fix create_group_session_conversation to bypass RLS
CREATE OR REPLACE FUNCTION create_group_session_conversation(p_group_session_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id uuid;
  v_tutor_id uuid;
  v_status text;
  v_student_record RECORD;
BEGIN
  SELECT tutor_id, status
  INTO v_tutor_id, v_status
  FROM group_sessions
  WHERE id = p_group_session_id;

  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Group session not found or does not have an assigned tutor';
  END IF;

  IF v_status NOT IN ('assigned', 'approved', 'completed') THEN
    RAISE EXCEPTION 'Group session must be assigned or approved to create chat';
  END IF;

  IF auth.uid() != v_tutor_id AND NOT EXISTS (
    SELECT 1 FROM group_session_participants
    WHERE group_session_id = p_group_session_id
    AND student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to create conversation for this group session';
  END IF;

  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE group_session_id = p_group_session_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO chat_conversations (group_session_id)
  VALUES (p_group_session_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO chat_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_tutor_id);

  FOR v_student_record IN
    SELECT student_id
    FROM group_session_participants
    WHERE group_session_id = p_group_session_id
  LOOP
    INSERT INTO chat_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_student_record.student_id);
  END LOOP;

  RETURN v_conversation_id;
END;
$$;

/*
  # Add Helper Functions for Chat Setup

  1. New Functions
    - `create_booking_conversation`: Creates a conversation for a booking with proper participants
    - `create_group_session_conversation`: Creates a conversation for a group session with all participants

  2. Security
    - Functions use SECURITY DEFINER to bypass RLS when adding participants
    - Functions validate that users are authorized before creating conversations
*/

-- Function to create a conversation for a booking
CREATE OR REPLACE FUNCTION create_booking_conversation(p_booking_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id uuid;
  v_student_id uuid;
  v_tutor_id uuid;
  v_status text;
BEGIN
  -- Get booking details and verify eligibility
  SELECT student_id, tutor_id, status
  INTO v_student_id, v_tutor_id, v_status
  FROM bookings
  WHERE id = p_booking_id;

  -- Validate booking exists and has required data
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Booking does not have an assigned tutor';
  END IF;

  IF v_status NOT IN ('approved', 'assigned', 'completed') THEN
    RAISE EXCEPTION 'Booking must be approved or assigned to create chat';
  END IF;

  -- Verify caller is either student or tutor
  IF auth.uid() NOT IN (v_student_id, v_tutor_id) THEN
    RAISE EXCEPTION 'Not authorized to create conversation for this booking';
  END IF;

  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE booking_id = p_booking_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create conversation
  INSERT INTO chat_conversations (booking_id)
  VALUES (p_booking_id)
  RETURNING id INTO v_conversation_id;

  -- Add participants (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO chat_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, v_student_id),
    (v_conversation_id, v_tutor_id);

  RETURN v_conversation_id;
END;
$$;

-- Function to create a conversation for a group session
CREATE OR REPLACE FUNCTION create_group_session_conversation(p_group_session_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id uuid;
  v_tutor_id uuid;
  v_status text;
  v_student_record RECORD;
BEGIN
  -- Get group session details and verify eligibility
  SELECT tutor_id, status
  INTO v_tutor_id, v_status
  FROM group_sessions
  WHERE id = p_group_session_id;

  -- Validate group session exists and has required data
  IF v_tutor_id IS NULL THEN
    RAISE EXCEPTION 'Group session not found or does not have an assigned tutor';
  END IF;

  IF v_status NOT IN ('assigned', 'approved', 'completed') THEN
    RAISE EXCEPTION 'Group session must be assigned or approved to create chat';
  END IF;

  -- Verify caller is either the tutor or a participant
  IF auth.uid() != v_tutor_id AND NOT EXISTS (
    SELECT 1 FROM group_session_participants
    WHERE group_session_id = p_group_session_id
    AND student_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to create conversation for this group session';
  END IF;

  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE group_session_id = p_group_session_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create conversation
  INSERT INTO chat_conversations (group_session_id)
  VALUES (p_group_session_id)
  RETURNING id INTO v_conversation_id;

  -- Add tutor as participant
  INSERT INTO chat_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_tutor_id);

  -- Add all student participants
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_booking_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_session_conversation(uuid) TO authenticated;

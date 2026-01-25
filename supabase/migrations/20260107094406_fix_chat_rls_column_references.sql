/*
  # Fix Chat RLS Policies - Correct Column References

  1. Problem
    - Several policies have incorrect column references causing infinite recursion:
      - chat_conversations policies reference chat_participants.id instead of chat_conversations.id
      - chat_participants view policy compares cp.conversation_id = cp.conversation_id (always true)

  2. Solution
    - Drop and recreate policies with correct column references
    - Ensure policies reference the correct table's columns

  3. Security
    - Maintains same security model but fixes the infinite recursion bug
*/

-- Fix chat_conversations policies
DROP POLICY IF EXISTS "View own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Update conversation timestamp" ON chat_conversations;

CREATE POLICY "View own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.conversation_id = chat_conversations.id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Update conversation timestamp"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.conversation_id = chat_conversations.id
      AND chat_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.conversation_id = chat_conversations.id
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Fix chat_participants view policy
DROP POLICY IF EXISTS "View conversation participants" ON chat_participants;

CREATE POLICY "View conversation participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

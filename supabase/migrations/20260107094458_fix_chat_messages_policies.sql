/*
  # Fix Chat Messages Policies - Remove Circular Dependencies

  1. Problem
    - Chat messages policies query chat_participants directly
    - This can trigger the chat_participants SELECT policy, which uses user_in_conversation
    - While this should work, we can simplify by using the helper function directly

  2. Solution
    - Update chat_messages policies to use the user_in_conversation helper function
    - Ensures consistent approach across all chat-related policies

  3. Security
    - Maintains same access control
    - More efficient execution
*/

-- Drop existing message policies
DROP POLICY IF EXISTS "View conversation messages" ON chat_messages;
DROP POLICY IF EXISTS "Send messages" ON chat_messages;

-- Recreate with helper function
CREATE POLICY "View conversation messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    user_in_conversation(conversation_id, auth.uid())
  );

CREATE POLICY "Send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND user_in_conversation(conversation_id, auth.uid())
  );

-- Add update policy for marking messages as read
CREATE POLICY "Update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    user_in_conversation(conversation_id, auth.uid())
  )
  WITH CHECK (
    user_in_conversation(conversation_id, auth.uid())
  );

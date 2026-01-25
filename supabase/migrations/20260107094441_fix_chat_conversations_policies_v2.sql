/*
  # Fix Chat Conversations Policies - Remove Circular Dependencies

  1. Problem
    - Chat conversations policies query chat_participants
    - Chat participants policies query themselves
    - This can create circular dependency chains

  2. Solution
    - Use SECURITY DEFINER functions for all membership checks
    - Ensure no policy queries a table that might recursively check back

  3. Security
    - Maintains same access control
    - Eliminates all circular dependencies
*/

-- Drop existing conversation policies
DROP POLICY IF EXISTS "View own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Update conversation timestamp" ON chat_conversations;

-- Recreate policies using the helper function
CREATE POLICY "View own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    user_in_conversation(id, auth.uid())
  );

CREATE POLICY "Update conversation timestamp"
  ON chat_conversations FOR UPDATE
  TO authenticated
  USING (
    user_in_conversation(id, auth.uid())
  )
  WITH CHECK (
    user_in_conversation(id, auth.uid())
  );

/*
  # Fix Chat Participants View Policy - Remove Self-Reference

  1. Problem
    - The "View conversation participants" policy queries chat_participants to check membership
    - This creates infinite recursion: to view participants, it checks participants, which checks participants...

  2. Solution
    - Create a simpler policy that doesn't query the same table
    - Allow viewing participants through direct conversation access check
    - Use a SECURITY DEFINER function to check participation without recursion

  3. Security
    - Users can view participants in conversations they're part of
    - No circular dependencies
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "View conversation participants" ON chat_participants;

-- Create a function to check if user is in a conversation (bypasses RLS)
CREATE OR REPLACE FUNCTION user_in_conversation(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
$$;

-- Create new policy using the function
CREATE POLICY "View conversation participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    user_in_conversation(conversation_id, auth.uid())
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_in_conversation(uuid, uuid) TO authenticated;

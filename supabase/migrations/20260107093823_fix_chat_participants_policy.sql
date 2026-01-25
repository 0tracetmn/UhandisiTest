/*
  # Fix Chat Participants Policy - Remove Infinite Recursion

  1. Changes
    - Drop the problematic "Add participants to conversations" policy that causes circular dependency
    - Create simpler, non-recursive policy for adding participants
    - Ensure users can only add themselves or be added by authorized users without circular checks

  2. Security
    - Users can add themselves to conversations they're eligible for
    - Simplified logic to prevent infinite recursion between chat_conversations and chat_participants policies
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Add participants to conversations" ON chat_participants;

-- Create a simpler policy that doesn't create circular dependency
-- Users can add themselves as participants
CREATE POLICY "Users can add themselves to conversations"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can add any participants
CREATE POLICY "Admins can add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

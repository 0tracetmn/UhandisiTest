/*
  # Fix Group Sessions View Policy

  1. Changes
    - Add policy to allow students to view forming/ready group sessions
    - This allows students to find and join existing group sessions
    - Removes the circular dependency that caused infinite recursion
  
  2. Notes
    - Students need to see available group sessions before joining
    - The original policy only allowed viewing sessions they're already in
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Students can view their group sessions" ON group_sessions;

-- Add new policies with better logic
CREATE POLICY "Students can view available group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    status IN ('forming', 'ready')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

CREATE POLICY "Students can view their enrolled group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    status NOT IN ('forming', 'ready')
    AND EXISTS (
      SELECT 1 FROM group_session_participants
      WHERE group_session_participants.group_session_id = group_sessions.id
      AND group_session_participants.student_id = auth.uid()
    )
  );
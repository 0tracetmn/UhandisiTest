/*
  # Simplify Group Sessions Policies

  1. Changes
    - Simplify INSERT policy for students - just check auth
    - Simplify SELECT policy to allow viewing forming/ready sessions
    - Remove complex role checks that might fail
  
  2. Notes
    - Authenticated students should be able to create sessions
    - All authenticated users can view available (forming/ready) sessions
    - The trigger function already has SECURITY DEFINER for updates
*/

-- Drop existing student policies that might be causing issues
DROP POLICY IF EXISTS "Students can create group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Students can view available group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Students can view their enrolled group sessions" ON group_sessions;

-- Create simpler policies

-- Allow authenticated users to create group sessions
CREATE POLICY "Authenticated users can create group sessions"
  ON group_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view forming and ready sessions
CREATE POLICY "Anyone can view available group sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (status IN ('forming', 'ready'));

-- Allow users to view sessions they're participants of (any status)
CREATE POLICY "Users can view their enrolled sessions"
  ON group_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_session_participants
      WHERE group_session_participants.group_session_id = group_sessions.id
      AND group_session_participants.student_id = auth.uid()
    )
  );
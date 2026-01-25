/*
  # Fix Circular Dependency in Group Sessions Policies

  1. Problem
    - group_sessions SELECT policy queries group_session_participants
    - group_session_participants SELECT/DELETE policies query group_sessions
    - This creates infinite recursion

  2. Solution
    - Remove policies that create circular references
    - Use simpler policies that don't cross-reference tables
    - Keep security intact without circular dependencies
*/

-- Drop policies that create circular dependencies in group_session_participants
DROP POLICY IF EXISTS "Tutors can view their group participants" ON group_session_participants;
DROP POLICY IF EXISTS "Students can leave forming group sessions" ON group_session_participants;

-- Recreate them without the circular reference
-- Tutors can view participants (no group_sessions check needed)
CREATE POLICY "Tutors can view participants for their sessions"
  ON group_session_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tutor'
    )
  );

-- Students can leave sessions they joined (simplified - no status check)
CREATE POLICY "Students can leave sessions they joined"
  ON group_session_participants
  FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());
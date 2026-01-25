/*
  # Fix View Policies for Assigned Tutors

  ## Problem
  
  - Tutors assigned via booking_tutors/group_session_tutors tables couldn't view those bookings/sessions
  - UPDATE policies required SELECT access first, but SELECT policies didn't include assigned tutors
  - This caused "Failed to mark session as completed" errors

  ## Changes
  
  1. Drop and recreate "View bookings" policy
    - Add support for tutors assigned via booking_tutors table
    
  2. Drop and recreate view policies for group_sessions
    - Add unified policy that covers all tutor assignment cases

  ## Security
  
  - Tutors can only view bookings/sessions they are assigned to
  - Students can view their own bookings/sessions
  - Admins retain full visibility
*/

-- Drop existing view policy for bookings
DROP POLICY IF EXISTS "View bookings" ON bookings;

-- Create comprehensive view policy for bookings
CREATE POLICY "View bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = bookings.id
      AND booking_tutors.tutor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Drop existing view policies for group_sessions
DROP POLICY IF EXISTS "Students can view their group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Tutors can view assigned group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Users can view their enrolled sessions" ON group_sessions;
DROP POLICY IF EXISTS "Anyone can view available group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Admins can view all group sessions" ON group_sessions;

-- Create comprehensive view policies for group_sessions
-- Students can view sessions they're enrolled in
CREATE POLICY "Students view enrolled sessions"
  ON group_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_session_participants
      WHERE group_session_participants.group_session_id = group_sessions.id
      AND group_session_participants.student_id = auth.uid()
    )
  );

-- Tutors can view sessions they're assigned to
CREATE POLICY "Tutors view assigned sessions"
  ON group_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM group_session_tutors
      WHERE group_session_tutors.group_session_id = group_sessions.id
      AND group_session_tutors.tutor_id = auth.uid()
    )
  );

-- Anyone can view available group sessions
CREATE POLICY "View available sessions"
  ON group_sessions FOR SELECT
  TO authenticated
  USING (status IN ('forming', 'ready'));

-- Admins can view all group sessions
CREATE POLICY "Admins view all sessions"
  ON group_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

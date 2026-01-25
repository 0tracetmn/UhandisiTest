/*
  # Add Delete Policies for Cancelled Bookings and Group Sessions

  1. Changes
    - Add DELETE policies for bookings table to allow removal of cancelled bookings
    - Add DELETE policies for group_sessions table to allow removal of cancelled sessions
  
  2. Security
    - Students can only delete their own cancelled bookings
    - Tutors can delete cancelled bookings they are assigned to
    - Admins can delete any cancelled bookings
    - Same rules apply for group sessions
*/

-- Delete policy for bookings: Students can delete their own cancelled bookings
CREATE POLICY "Students can delete own cancelled bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    student_id = auth.uid()
  );

-- Delete policy for bookings: Tutors can delete their assigned cancelled bookings
CREATE POLICY "Tutors can delete assigned cancelled bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    (
      tutor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM booking_tutors
        WHERE booking_tutors.booking_id = bookings.id
        AND booking_tutors.tutor_id = auth.uid()
      )
    )
  );

-- Delete policy for bookings: Admins can delete any cancelled bookings
CREATE POLICY "Admins can delete any cancelled bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Delete policy for group_sessions: Students can delete cancelled sessions they joined
CREATE POLICY "Students can delete cancelled group sessions they joined"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    EXISTS (
      SELECT 1 FROM group_session_participants
      WHERE group_session_participants.group_session_id = group_sessions.id
      AND group_session_participants.student_id = auth.uid()
    )
  );

-- Delete policy for group_sessions: Tutors can delete their assigned cancelled sessions
CREATE POLICY "Tutors can delete assigned cancelled group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    (
      tutor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM group_session_tutors
        WHERE group_session_tutors.group_session_id = group_sessions.id
        AND group_session_tutors.tutor_id = auth.uid()
      )
    )
  );

-- Delete policy for group_sessions: Admins can delete any cancelled sessions
CREATE POLICY "Admins can delete any cancelled group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    status = 'cancelled' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

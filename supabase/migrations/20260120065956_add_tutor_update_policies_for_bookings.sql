/*
  # Add Tutor Update Policies for Bookings and Group Sessions

  ## Changes
  
  1. Bookings Table
    - Add UPDATE policy for tutors to update bookings they are assigned to
    - Tutors can update bookings where they are the primary tutor (tutor_id)
    - Tutors can update bookings where they are assigned via booking_tutors table
    
  2. Group Sessions Table
    - Add UPDATE policy for tutors to update group sessions they are assigned to
    - Tutors can update group sessions where they are the primary tutor (tutor_id)
    - Tutors can update group sessions where they are assigned via group_session_tutors table

  ## Security
  
  - Tutors can only update their own assigned bookings/sessions
  - Students and admins retain their existing permissions
  - All policies use proper authentication checks
*/

-- Tutors can update bookings assigned to them
CREATE POLICY "Tutors update assigned bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = bookings.id
      AND booking_tutors.tutor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  )
  WITH CHECK (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = bookings.id
      AND booking_tutors.tutor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

-- Tutors can update group sessions assigned to them
CREATE POLICY "Tutors update assigned group sessions"
  ON group_sessions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM group_session_tutors
      WHERE group_session_tutors.group_session_id = group_sessions.id
      AND group_session_tutors.tutor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  )
  WITH CHECK (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM group_session_tutors
      WHERE group_session_tutors.group_session_id = group_sessions.id
      AND group_session_tutors.tutor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

/*
  # Fix Tutor Update Policies for Bookings and Group Sessions

  ## Changes
  
  1. Drop overly permissive policies
    - Remove "Tutors update assigned bookings" policy that allowed any tutor to update any booking
    - Remove "Tutors update assigned group sessions" policy that allowed any tutor to update any session
    
  2. Create correct restrictive policies
    - Tutors can ONLY update bookings where they are specifically assigned (via tutor_id or booking_tutors table)
    - Tutors can ONLY update group sessions where they are specifically assigned (via tutor_id or group_session_tutors table)

  ## Security
  
  - Policies now properly restrict tutors to only their assigned bookings/sessions
  - Students and admins retain their existing permissions
  - All policies use proper authentication and authorization checks
*/

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Tutors update assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Tutors update assigned group sessions" ON group_sessions;

-- Create correct restrictive policy for bookings
-- Tutors can ONLY update bookings where they are the primary tutor OR assigned via booking_tutors
CREATE POLICY "Tutors can update their assigned bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = bookings.id
      AND booking_tutors.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = bookings.id
      AND booking_tutors.tutor_id = auth.uid()
    )
  );

-- Create correct restrictive policy for group sessions
-- Tutors can ONLY update group sessions where they are the primary tutor OR assigned via group_session_tutors
CREATE POLICY "Tutors can update their assigned group sessions"
  ON group_sessions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM group_session_tutors
      WHERE group_session_tutors.group_session_id = group_sessions.id
      AND group_session_tutors.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = tutor_id OR
    EXISTS (
      SELECT 1 FROM group_session_tutors
      WHERE group_session_tutors.group_session_id = group_sessions.id
      AND group_session_tutors.tutor_id = auth.uid()
    )
  );

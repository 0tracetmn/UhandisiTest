/*
  # Fix Infinite Recursion in Booking Delete Policies

  1. Problem
    - DELETE policies on bookings reference booking_tutors table
    - SELECT policies on booking_tutors reference bookings table
    - This creates circular dependency causing infinite recursion

  2. Solution
    - Drop existing problematic DELETE policies
    - Create helper functions with SECURITY DEFINER to bypass RLS
    - Recreate DELETE policies using helper functions
    - Add support for 'rejected' status in addition to 'cancelled'

  3. Security
    - Helper functions are secure and only check specific conditions
    - Maintain same access control: students own bookings, tutors assigned, admins all
    - Apply same rules to both cancelled and rejected bookings
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can delete own cancelled bookings" ON bookings;
DROP POLICY IF EXISTS "Tutors can delete assigned cancelled bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any cancelled bookings" ON bookings;
DROP POLICY IF EXISTS "Students can delete cancelled group sessions they joined" ON group_sessions;
DROP POLICY IF EXISTS "Tutors can delete assigned cancelled group sessions" ON group_sessions;
DROP POLICY IF EXISTS "Admins can delete any cancelled group sessions" ON group_sessions;

-- Helper function to check if user is a tutor assigned to a booking (bypasses RLS)
CREATE OR REPLACE FUNCTION is_tutor_assigned_to_booking(p_booking_id uuid, p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM booking_tutors
    WHERE booking_id = p_booking_id
    AND tutor_id = p_user_id
  );
END;
$$;

-- Helper function to check if user is a tutor assigned to a group session (bypasses RLS)
CREATE OR REPLACE FUNCTION is_tutor_assigned_to_group_session(p_session_id uuid, p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_session_tutors
    WHERE group_session_id = p_session_id
    AND tutor_id = p_user_id
  );
END;
$$;

-- Helper function to check if user is a student in a group session (bypasses RLS)
CREATE OR REPLACE FUNCTION is_student_in_group_session(p_session_id uuid, p_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_session_participants
    WHERE group_session_id = p_session_id
    AND student_id = p_user_id
  );
END;
$$;

-- Recreate DELETE policies for bookings with helper functions

-- Students can delete their own cancelled or rejected bookings
CREATE POLICY "Students can delete own cancelled or rejected bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    student_id = auth.uid()
  );

-- Tutors can delete their assigned cancelled or rejected bookings
CREATE POLICY "Tutors can delete assigned cancelled or rejected bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    (
      tutor_id = auth.uid() OR
      is_tutor_assigned_to_booking(id, auth.uid())
    )
  );

-- Admins can delete any cancelled or rejected bookings
CREATE POLICY "Admins can delete any cancelled or rejected bookings"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Recreate DELETE policies for group_sessions with helper functions

-- Students can delete cancelled or rejected group sessions they joined
CREATE POLICY "Students can delete cancelled or rejected group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    is_student_in_group_session(id, auth.uid())
  );

-- Tutors can delete their assigned cancelled or rejected sessions
CREATE POLICY "Tutors can delete assigned cancelled or rejected group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    (
      tutor_id = auth.uid() OR
      is_tutor_assigned_to_group_session(id, auth.uid())
    )
  );

-- Admins can delete any cancelled or rejected sessions
CREATE POLICY "Admins can delete any cancelled or rejected group sessions"
  ON group_sessions
  FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected') AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

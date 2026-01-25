/*
  # Break Circular RLS Dependencies with Security Definer Functions

  ## Problem
  
  Still getting "infinite recursion detected in policy for relation 'bookings'" when creating bookings.
  
  The circular dependency chain:
  1. bookings INSERT triggers SELECT policy to return data
  2. bookings SELECT policy checks: EXISTS (SELECT FROM booking_tutors ...)
  3. booking_tutors SELECT policy checks: EXISTS (SELECT FROM bookings ...)
  4. This creates infinite loop during policy evaluation
  
  ## Solution
  
  Use SECURITY DEFINER functions to break the circular dependency:
  - Create helper functions that bypass RLS to check permissions
  - These functions run with elevated privileges and don't trigger recursive policy checks
  - Update policies to use these functions instead of direct subqueries
  
  ## Changes
  
  1. Create security definer functions for permission checks
  2. Update booking_tutors and booking_subjects SELECT policies to use these functions
  3. Keep bookings SELECT policy as-is (it needs the booking_tutors check)
  
  ## Security
  
  - Functions are SECURITY DEFINER but only return boolean (safe)
  - They only check ownership/membership, not return sensitive data
  - Maintains same security model, just breaks the circular dependency
*/

-- Create function to check if user is student of a booking (bypasses RLS)
CREATE OR REPLACE FUNCTION is_booking_student(p_booking_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
    AND student_id = p_user_id
  );
END;
$$;

-- Create function to check if user is tutor of a booking (bypasses RLS)
CREATE OR REPLACE FUNCTION is_booking_tutor(p_booking_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
    AND tutor_id = p_user_id
  );
END;
$$;

-- Create function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role = 'admin'
  );
END;
$$;

-- Drop and recreate booking_tutors SELECT policies using security definer functions
DROP POLICY IF EXISTS "Students can view their booking tutors" ON booking_tutors;
DROP POLICY IF EXISTS "Tutors can view all booking tutor records" ON booking_tutors;

-- Students can view tutors for their bookings
CREATE POLICY "Students can view their booking tutors"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    is_booking_student(booking_id, auth.uid())
  );

-- Tutors can view their assignments and bookings they're primary tutor for
CREATE POLICY "Tutors can view all booking tutor records"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    tutor_id = auth.uid() OR
    is_booking_tutor(booking_id, auth.uid())
  );

-- Admins can view all booking tutors
CREATE POLICY "Admins can view all booking tutors"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- Drop and recreate booking_subjects SELECT policies using security definer functions
DROP POLICY IF EXISTS "Tutors can view their booking subjects" ON booking_subjects;

-- Recreate with security definer function
CREATE POLICY "Tutors can view their booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    is_booking_tutor(booking_id, auth.uid()) OR
    EXISTS (
      SELECT 1 FROM booking_tutors
      WHERE booking_tutors.booking_id = booking_subjects.booking_id
      AND booking_tutors.tutor_id = auth.uid()
    )
  );

-- Students can view their booking subjects
CREATE POLICY "Students can view their booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    is_booking_student(booking_id, auth.uid())
  );

-- Admins can view all booking subjects already covered by existing policy

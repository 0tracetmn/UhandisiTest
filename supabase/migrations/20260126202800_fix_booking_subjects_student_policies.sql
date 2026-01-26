/*
  # Fix Booking Subjects Student Policies

  ## Problem
  
  The "Students can manage own booking subjects" policy with cmd:ALL creates a circular dependency
  when students try to view their bookings with subjects joined:
  - bookings SELECT policy is evaluated
  - booking_subjects SELECT policies are evaluated (including the ALL policy)
  - The ALL policy has direct EXISTS (SELECT FROM bookings ...) creating circular dependency
  
  ## Solution
  
  Drop the problematic ALL policy and replace with specific INSERT/UPDATE/DELETE policies
  that use security definer functions to avoid circular dependencies.
  
  ## Changes
  
  1. Drop "Students can manage own booking subjects" ALL policy
  2. Create separate INSERT, UPDATE, DELETE policies using is_booking_student() function
  3. Keep existing SELECT policy (already uses security definer function)
  
  ## Security
  
  - Maintains same access control for students
  - Breaks circular dependency by using security definer functions
  - Students can only manage subjects for their own bookings
*/

-- Drop the problematic ALL policy
DROP POLICY IF EXISTS "Students can manage own booking subjects" ON booking_subjects;

-- Create INSERT policy for students using security definer function
CREATE POLICY "Students can insert own booking subjects"
  ON booking_subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    is_booking_student(booking_id, auth.uid())
  );

-- Create UPDATE policy for students using security definer function
CREATE POLICY "Students can update own booking subjects"
  ON booking_subjects FOR UPDATE
  TO authenticated
  USING (
    is_booking_student(booking_id, auth.uid())
  )
  WITH CHECK (
    is_booking_student(booking_id, auth.uid())
  );

-- Create DELETE policy for students using security definer function
CREATE POLICY "Students can delete own booking subjects"
  ON booking_subjects FOR DELETE
  TO authenticated
  USING (
    is_booking_student(booking_id, auth.uid())
  );

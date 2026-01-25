/*
  # Fix Last Circular Dependency in Booking Subjects

  ## Problem
  
  One remaining policy still has a direct subquery to booking_tutors:
  - "Tutors can view their booking subjects" contains: EXISTS (SELECT FROM booking_tutors ...)
  - This creates circular dependency with booking_tutors policies
  
  ## Solution
  
  Update the policy to only use security definer functions, removing the direct subquery.
  
  ## Changes
  
  Drop and recreate "Tutors can view their booking subjects" policy
  to use only is_booking_tutor() and is_assigned_tutor() functions.
  
  ## Security
  
  Maintains same access control, just breaks the circular dependency.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tutors can view their booking subjects" ON booking_subjects;

-- Recreate using only security definer functions (no direct subqueries)
CREATE POLICY "Tutors can view their booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    is_booking_tutor(booking_id, auth.uid()) OR
    is_assigned_tutor(booking_id, auth.uid())
  );

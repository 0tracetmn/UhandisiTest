/*
  # Fix Circular RLS Dependencies Causing Infinite Recursion

  ## Problem
  
  - Infinite recursion detected in policies
  - booking_subjects checks booking_tutors
  - booking_tutors checks bookings
  - bookings checks booking_tutors
  - This causes queries to fail and bookings to disappear

  ## Solution
  
  - Simplify policies to avoid circular references
  - Use direct joins instead of nested EXISTS checks
  - Ensure policies can be evaluated without infinite loops

  ## Changes
  
  1. Simplify booking_subjects policies
  2. Simplify booking_tutors policies
  3. Keep bookings policies simple
*/

-- Drop problematic policies on booking_subjects
DROP POLICY IF EXISTS "Tutors can view their booking subjects" ON booking_subjects;

-- Recreate with direct check instead of nested EXISTS
CREATE POLICY "Tutors can view their booking subjects"
  ON booking_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_subjects.booking_id
      AND b.tutor_id = auth.uid()
    )
  );

-- Drop problematic policy on booking_tutors
DROP POLICY IF EXISTS "Students can view their booking tutors" ON booking_tutors;

-- Recreate with simpler check to avoid recursion
CREATE POLICY "Students can view their booking tutors"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_tutors.booking_id
      AND b.student_id = auth.uid()
    )
  );

-- Add policy for tutors to view bookings they're assigned to via booking_tutors
-- This should also include the primary tutor check
DROP POLICY IF EXISTS "Tutors can view their booking tutors" ON booking_tutors;

CREATE POLICY "Tutors can view all booking tutor records"
  ON booking_tutors FOR SELECT
  TO authenticated
  USING (
    tutor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_tutors.booking_id
      AND b.tutor_id = auth.uid()
    )
  );

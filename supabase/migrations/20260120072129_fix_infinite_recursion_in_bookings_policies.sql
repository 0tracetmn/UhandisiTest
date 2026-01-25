/*
  # Fix Infinite Recursion in Bookings RLS Policies

  ## Problem
  
  Infinite recursion detected in bookings table policies causing:
  - "Failed to submit booking: infinite recursion detected in policy for relation 'bookings'"
  - No bookings displaying on any dashboard
  - Unable to create new bookings
  
  The circular dependency chain:
  1. bookings DELETE policy uses is_tutor_assigned_to_booking() function
  2. Function queries booking_tutors table
  3. booking_tutors SELECT policies query bookings table
  4. This creates infinite loop during policy evaluation
  
  ## Solution
  
  1. Drop the problematic DELETE policy that uses the function
  2. Recreate DELETE policy using direct subquery (same as UPDATE policy pattern)
  3. Ensure the is_tutor_assigned_to_booking function is only used where necessary
  4. Remove duplicate SELECT policies on booking_tutors that create circular refs
  
  ## Changes
  
  1. Drop and recreate "Tutors can delete assigned cancelled or rejected bookings" policy
  2. Remove duplicate "Tutors can view their assignments" policy (redundant with "Tutors can view all booking tutor records")
  3. Ensure all policies use consistent patterns to avoid circular dependencies

  ## Security
  
  - Maintains same security model
  - Tutors can only delete cancelled/rejected bookings they're assigned to
  - No data access changes, just eliminates circular dependency
*/

-- Drop the problematic DELETE policy
DROP POLICY IF EXISTS "Tutors can delete assigned cancelled or rejected bookings" ON bookings;

-- Recreate with direct EXISTS check (same pattern as UPDATE policy)
CREATE POLICY "Tutors can delete assigned cancelled or rejected bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected')
    AND (
      tutor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM booking_tutors
        WHERE booking_tutors.booking_id = bookings.id
        AND booking_tutors.tutor_id = auth.uid()
      )
    )
  );

-- Remove duplicate policy on booking_tutors that creates unnecessary circular reference
DROP POLICY IF EXISTS "Tutors can view their assignments" ON booking_tutors;

-- The "Tutors can view all booking tutor records" policy already covers this case
-- and is safe because it only references bookings in a non-recursive way

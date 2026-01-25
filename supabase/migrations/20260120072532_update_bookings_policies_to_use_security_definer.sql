/*
  # Update Bookings Policies to Use Security Definer Functions

  ## Problem
  
  The circular dependency still exists because:
  1. bookings SELECT/UPDATE/DELETE policies query booking_tutors
  2. booking_tutors SELECT policies query bookings (via security definer functions)
  3. This creates a circular dependency during policy evaluation
  
  ## Solution
  
  Create a security definer function to check if a tutor is assigned via booking_tutors,
  and update all bookings policies to use this function instead of direct subqueries.
  
  ## Changes
  
  1. Create is_assigned_tutor() security definer function
  2. Update "View bookings" SELECT policy to use the function
  3. Update "Tutors can update their assigned bookings" UPDATE policy
  4. Update "Tutors can delete assigned cancelled or rejected bookings" DELETE policy
  
  ## Security
  
  - Function bypasses RLS but only returns boolean (safe)
  - Maintains same security model
  - Breaks circular dependency completely
*/

-- Create function to check if user is assigned as additional tutor (bypasses RLS)
CREATE OR REPLACE FUNCTION is_assigned_tutor(p_booking_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM booking_tutors
    WHERE booking_id = p_booking_id
    AND tutor_id = p_user_id
  );
END;
$$;

-- Update bookings SELECT policy to use security definer function
DROP POLICY IF EXISTS "View bookings" ON bookings;

CREATE POLICY "View bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    auth.uid() = tutor_id OR
    is_assigned_tutor(id, auth.uid()) OR
    is_admin(auth.uid())
  );

-- Update bookings UPDATE policy to use security definer function
DROP POLICY IF EXISTS "Tutors can update their assigned bookings" ON bookings;

CREATE POLICY "Tutors can update their assigned bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tutor_id OR
    is_assigned_tutor(id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = tutor_id OR
    is_assigned_tutor(id, auth.uid())
  );

-- Update bookings DELETE policy to use security definer function
DROP POLICY IF EXISTS "Tutors can delete assigned cancelled or rejected bookings" ON bookings;

CREATE POLICY "Tutors can delete assigned cancelled or rejected bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    (status = 'cancelled' OR status = 'rejected')
    AND (
      tutor_id = auth.uid() OR
      is_assigned_tutor(id, auth.uid())
    )
  );

/*
  # Add admin tutor approval policy

  1. Changes
    - Add RLS policy allowing admins to update tutor_details status
    - This enables admins to approve or reject tutor applications

  2. Security
    - Policy restricted to users with 'admin' role only
    - Admins can update any tutor_details record
    - Regular tutors can still update their own details (existing policy)

  3. Important Notes
    - The status field already exists with check constraint: ('pending', 'approved', 'rejected')
    - This policy works alongside existing tutor self-update policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tutor_details' 
    AND policyname = 'Admins can update tutor status'
  ) THEN
    CREATE POLICY "Admins can update tutor status"
      ON tutor_details FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
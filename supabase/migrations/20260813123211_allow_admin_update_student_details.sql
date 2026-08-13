/*
  # Allow admins to update student_details

  1. Purpose
    - Admins need to repair records for students whose sign-up did not save
      grade / school / province / parent info (older accounts).

  2. Changes
    - Adds an UPDATE policy on public.student_details that allows the admin
      role to update any row, in addition to the existing owner-scoped policy.

  3. Security
    - Read-side admin access already exists.
    - This policy only extends UPDATE. INSERT/DELETE remain untouched.
*/

DROP POLICY IF EXISTS "Admins update any student details" ON public.student_details;
CREATE POLICY "Admins update any student details"
  ON public.student_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

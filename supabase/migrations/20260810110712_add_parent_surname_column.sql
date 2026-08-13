/*
  # Add parent_surname column to student_details

  1. Changes
    - Adds `parent_surname` (text, nullable) to `student_details`
    - This column was expected by the app but was missing from the live database

  2. Notes
    - Existing rows will have NULL for parent_surname
    - Idempotent: uses IF NOT EXISTS check
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_details'
      AND column_name = 'parent_surname'
  ) THEN
    ALTER TABLE public.student_details ADD COLUMN parent_surname text;
  END IF;
END $$;

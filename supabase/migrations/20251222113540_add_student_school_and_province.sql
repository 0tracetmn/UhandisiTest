/*
  # Add School and Province Fields to Student Details

  1. Changes to `student_details` table
    - Add `school` column (text) - Name of the student's school
    - Add `province` column (text) - Province where the student is located
  
  2. Notes
    - These fields will be required for student registration
    - Existing student records will have NULL values initially
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'school'
  ) THEN
    ALTER TABLE student_details ADD COLUMN school text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'province'
  ) THEN
    ALTER TABLE student_details ADD COLUMN province text;
  END IF;
END $$;
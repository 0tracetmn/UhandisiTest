/*
  # Add Parent Phone Field to Student Details

  1. Changes to `student_details` table
    - Add `parent_phone` column (text) - Parent/Guardian contact number
      - This is a required field for student registration
  
  2. Notes
    - This field stores the parent/guardian's phone number for communication
    - Existing student records will have NULL values initially
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'parent_phone'
  ) THEN
    ALTER TABLE student_details ADD COLUMN parent_phone text;
  END IF;
END $$;

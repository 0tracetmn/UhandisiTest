/*
  # Add Parent/Guardian Surname to Student Details

  1. Purpose
    - Add separate field for parent/guardian surname to capture structured parent information
    - Allows better organization of parent contact details

  2. Changes to `student_details` Table
    - Add `parent_surname` field (text, nullable)
    - Supports existing records without requiring data migration

  3. Notes
    - Existing records will have NULL for parent_surname
    - New registrations will capture both parent name and surname separately
*/

-- Add parent_surname column to student_details table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'parent_surname'
  ) THEN
    ALTER TABLE student_details ADD COLUMN parent_surname text;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN student_details.parent_surname IS 'Parent or guardian surname/last name';

/*
  # Add Fee Payer Field to Student Details

  1. Changes to `student_details` table
    - Add `fee_payer` column (text) - Indicates who will be paying the fees
      - Values: 'student' or 'parent'
      - Default: 'student'
  
  2. Notes
    - This field helps identify the responsible party for payment
    - Existing student records will default to 'student'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'fee_payer'
  ) THEN
    ALTER TABLE student_details ADD COLUMN fee_payer text DEFAULT 'student';
  END IF;
END $$;

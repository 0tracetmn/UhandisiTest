/*
  # Add qualifications field to tutor_details

  1. Changes
    - Add `qualifications_url` column to `tutor_details` table
      - Stores the URL of uploaded qualification documents
      - Nullable to support existing tutors

  2. Security
    - No RLS changes needed (inherits from existing table policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tutor_details' AND column_name = 'qualifications_url'
  ) THEN
    ALTER TABLE tutor_details ADD COLUMN qualifications_url text;
  END IF;
END $$;
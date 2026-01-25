/*
  # Add separate document fields to tutor_details

  1. Changes
    - Add `transcript_url` column to `tutor_details` table
      - Stores the URL of uploaded transcript documents
      - Nullable to support existing tutors
    - Add `id_copy_url` column to `tutor_details` table
      - Stores the URL of uploaded ID copy documents
      - Nullable to support existing tutors
    - Keep existing `qualifications_url` for qualification certificates

  2. Important Notes
    - This migration adds two new fields while preserving the existing qualifications_url
    - Existing tutors will have NULL values for the new fields
    - New tutors should upload all three documents during registration

  3. Security
    - No RLS changes needed (inherits from existing table policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tutor_details' AND column_name = 'transcript_url'
  ) THEN
    ALTER TABLE tutor_details ADD COLUMN transcript_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tutor_details' AND column_name = 'id_copy_url'
  ) THEN
    ALTER TABLE tutor_details ADD COLUMN id_copy_url text;
  END IF;
END $$;
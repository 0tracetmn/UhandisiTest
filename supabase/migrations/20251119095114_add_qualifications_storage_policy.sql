/*
  # Add Storage Policy for Qualifications Upload

  1. Changes
    - Add storage policy to allow authenticated users to upload qualifications
    - Qualifications are stored in the 'qualifications' folder within the 'materials' bucket

  2. Security
    - Only authenticated users can upload qualifications
    - Qualifications must be uploaded to the 'qualifications' folder
*/

-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Create new policy that allows uploads to both materials and qualifications folders
CREATE POLICY "Authenticated users can upload materials and qualifications"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  ((storage.foldername(name))[1] = 'materials' OR (storage.foldername(name))[1] = 'qualifications')
);
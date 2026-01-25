/*
  # Add Storage Policies for Materials Bucket

  1. Changes
    - Add storage policies to allow authenticated users to access materials
    - Admins and tutors can upload files
    - All authenticated users can view files
  
  2. Security
    - Files are only accessible to authenticated users
    - Upload restricted to admins and tutors
    - Students can view but files are protected by authentication
*/

-- Allow admins and tutors to upload materials
CREATE POLICY "Admins and tutors can upload materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'tutor')
  )
);

-- Allow authenticated users to view materials
CREATE POLICY "Authenticated users can view materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials');

-- Allow admins and tutors to delete materials
CREATE POLICY "Admins and tutors can delete materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'tutor')
  )
);

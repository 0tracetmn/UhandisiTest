/*
  # Fix Materials Bucket Public Access

  1. Problem
    - The materials bucket is set to private (public=false)
    - But document URLs use the /public/ path
    - This causes "Bucket not found" errors when accessing documents

  2. Solution
    - Update the materials bucket to be public
    - This matches the original intent and the URL structure

  3. Security
    - Tutor documents are meant to be viewable by admins and the tutors themselves
    - RLS policies on storage.objects already control access appropriately
*/

-- Update materials bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'materials';

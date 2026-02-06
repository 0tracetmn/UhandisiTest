/*
  # Fix Materials Storage Public Access

  1. Problem
    - The materials bucket is set to public (public=true)
    - But RLS policies only allow authenticated users to SELECT
    - This causes "refused to connect" errors when using public URLs
    - External viewers (Office Online, PDF viewers) can't access the files

  2. Solution
    - Add a policy to allow anonymous (public) read access to materials
    - This matches the bucket's public setting
    - Keep upload/delete restricted to authenticated admins/tutors

  3. Security
    - Files can be viewed by anyone with the URL (like YouTube unlisted videos)
    - Only authenticated admins/tutors can upload or delete
    - This prevents students from downloading via the UI, but files are viewable
*/

-- Allow public read access to materials (since bucket is public)
CREATE POLICY "Public can view materials"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'materials');

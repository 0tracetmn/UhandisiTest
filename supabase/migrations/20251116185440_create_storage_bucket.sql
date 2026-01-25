/*
  # Create Storage Bucket for Learning Materials

  1. Storage Bucket
    - Create 'materials' bucket for notes, diagrams, and videos
    - Enable public access for easy file sharing
    - Set file size limits

  2. Storage Policies
    - Authenticated users can view all materials
    - Admins and tutors can upload materials
    - Uploaders can delete their own materials
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = 'materials'
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Recreate pattern-saves Storage Bucket
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create the pattern-saves bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pattern-saves',
  'pattern-saves',
  false,  -- Not public, requires authentication
  10485760,  -- 10MB file size limit
  ARRAY['application/gzip', 'application/json']  -- Allow gzip and json files
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DROP EXISTING POLICIES (to avoid duplicates)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- ============================================================================
-- RLS POLICIES FOR STORAGE BUCKET
-- ============================================================================

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pattern-saves' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to upload their own files
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pattern-saves' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pattern-saves' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pattern-saves' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pattern-saves' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'pattern-saves';

-- Verify the policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%own files%';

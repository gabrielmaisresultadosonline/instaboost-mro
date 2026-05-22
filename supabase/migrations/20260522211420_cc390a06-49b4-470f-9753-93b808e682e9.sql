-- Ensure Assets bucket allows full management for announcements folder
DROP POLICY IF EXISTS "Anyone can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read announcement images" ON storage.objects;

CREATE POLICY "Anyone can manage announcement images" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'assets' AND 
  (storage.foldername(name))[1] = 'announcements'
)
WITH CHECK (
  bucket_id = 'assets' AND 
  (storage.foldername(name))[1] = 'announcements'
);

-- Allow managing announcements JSON files in user-data bucket
CREATE POLICY "Anyone can manage announcements JSON" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'user-data' AND 
  (storage.foldername(name))[1] = 'admin' AND
  name LIKE '%announcements.json'
)
WITH CHECK (
  bucket_id = 'user-data' AND 
  (storage.foldername(name))[1] = 'admin' AND
  name LIKE '%announcements.json'
);
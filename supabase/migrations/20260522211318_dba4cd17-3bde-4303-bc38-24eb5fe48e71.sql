-- Policy to allow anyone to upload images to the announcements folder in assets bucket
CREATE POLICY "Anyone can upload announcement images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'assets' AND 
  (storage.foldername(name))[1] = 'announcements'
);

-- Policy to allow anyone to read images from the announcements folder (though public read might already be enabled, this ensures it)
CREATE POLICY "Anyone can read announcement images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'assets' AND 
  (storage.foldername(name))[1] = 'announcements'
);
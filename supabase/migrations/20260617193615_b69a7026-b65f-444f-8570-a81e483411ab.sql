CREATE POLICY "Anyone can manage admin video cover assets"
ON storage.objects
FOR ALL
TO public
USING (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] IN ('video-covers', 'welcome-video', 'button-covers')
)
WITH CHECK (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] IN ('video-covers', 'welcome-video', 'button-covers')
);
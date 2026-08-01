CREATE POLICY "Anyone can upload mktcc media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'mktcc');

CREATE POLICY "Anyone can update mktcc media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'mktcc')
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'mktcc');
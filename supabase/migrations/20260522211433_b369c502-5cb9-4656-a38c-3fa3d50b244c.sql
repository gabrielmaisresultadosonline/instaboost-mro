-- Allow anyone to list and read everything in the admin folder of user-data
CREATE POLICY "Anyone can read admin folder in user-data" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'user-data' AND 
  (storage.foldername(name))[1] = 'admin'
);
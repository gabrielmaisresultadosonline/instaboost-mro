-- Reset policies for assets bucket
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Assets are public" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload assets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can update assets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete assets" ON storage.objects;
END $$;

CREATE POLICY "Assets are public" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'assets');

CREATE POLICY "Anyone can upload assets" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Anyone can update assets" 
ON storage.objects FOR UPDATE 
TO public
USING (bucket_id = 'assets');

CREATE POLICY "Anyone can delete assets" 
ON storage.objects FOR DELETE 
TO public
USING (bucket_id = 'assets');

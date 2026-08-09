-- 1. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_product_ebooks TO authenticated;
GRANT ALL ON public.hub_product_ebooks TO service_role;

-- 2. Create policy for management
DROP POLICY IF EXISTS "Authenticated users can manage ebooks" ON public.hub_product_ebooks;
CREATE POLICY "Authenticated users can manage ebooks" 
ON public.hub_product_ebooks 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Ensure storage permissions for the 'assets' bucket
-- Note: storage policies are in the 'storage' schema
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload assets' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload assets"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'assets');
    END IF;
END $$;

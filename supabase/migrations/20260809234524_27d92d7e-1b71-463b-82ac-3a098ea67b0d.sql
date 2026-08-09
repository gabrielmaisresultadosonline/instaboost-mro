-- Grant table access to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_product_ebooks TO authenticated;
GRANT ALL ON public.hub_product_ebooks TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.hub_product_ebooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Management policy for hub_product_ebooks" ON public.hub_product_ebooks;

-- Create a permissive policy for authenticated users (admins)
CREATE POLICY "Management policy for hub_product_ebooks"
ON public.hub_product_ebooks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure storage permissions are correct for the assets bucket
-- Using public policy for inserts/updates in the 'ebooks' folder if authenticated
DROP POLICY IF EXISTS "Allow authenticated uploads to ebooks" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to ebooks" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to ebooks"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'ebooks');

CREATE POLICY "Allow authenticated updates to ebooks"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'ebooks');

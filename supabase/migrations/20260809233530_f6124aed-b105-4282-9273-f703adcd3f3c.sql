GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_product_ebooks TO authenticated;
GRANT ALL ON public.hub_product_ebooks TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.hub_product_ebooks ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any and create a permissive one for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Authenticated users can manage ebooks" ON public.hub_product_ebooks;

CREATE POLICY "Authenticated users can manage ebooks"
ON public.hub_product_ebooks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

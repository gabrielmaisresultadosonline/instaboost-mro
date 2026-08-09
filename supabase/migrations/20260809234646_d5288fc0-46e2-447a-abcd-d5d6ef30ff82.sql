-- Ensure the table exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.hub_product_ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.hub_products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    audio_url TEXT,
    ebook_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RE-GRANT EVERYTHING explicitly to all roles to be absolutely sure
GRANT ALL ON TABLE public.hub_product_ebooks TO authenticated;
GRANT ALL ON TABLE public.hub_product_ebooks TO service_role;
GRANT ALL ON TABLE public.hub_product_ebooks TO postgres;
GRANT ALL ON TABLE public.hub_product_ebooks TO anon; -- Temporary for debugging, though not ideal

-- Explicitly enable RLS again
ALTER TABLE public.hub_product_ebooks ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy with the most permissive check possible for authenticated users
DROP POLICY IF EXISTS "Management policy for hub_product_ebooks" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.hub_product_ebooks;

CREATE POLICY "Enable all access for authenticated users"
ON public.hub_product_ebooks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure the sequence (if any) or ID generation is allowed, though using UUIDs
-- Grant access to the schema just in case it was restricted
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Adiciona colunas para ordem manual e tarja "New"
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS new_until TIMESTAMPTZ;

-- Grant access to public.hub_products for authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_products TO authenticated;
GRANT SELECT ON public.hub_products TO anon;
GRANT ALL ON public.hub_products TO service_role;

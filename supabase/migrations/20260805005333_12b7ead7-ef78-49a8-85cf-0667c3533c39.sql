-- Adiciona colunas para ordem manual e tarja "New"
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS new_until TIMESTAMPTZ;

-- Atualiza grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_products TO authenticated;
GRANT SELECT ON public.hub_products TO anon;
GRANT ALL ON public.hub_products TO service_role;

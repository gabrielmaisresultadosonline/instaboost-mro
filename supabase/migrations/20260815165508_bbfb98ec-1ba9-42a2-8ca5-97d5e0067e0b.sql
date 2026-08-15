ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS is_redirect_only BOOLEAN DEFAULT false;

-- Re-grant permissions to ensure the API can read/write the new column
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_products TO authenticated;
GRANT ALL ON public.hub_products TO service_role;
GRANT SELECT ON public.hub_products TO anon;

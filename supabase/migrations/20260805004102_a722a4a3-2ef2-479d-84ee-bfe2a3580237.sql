-- Add status column to hub_products if it doesn't exist
ALTER TABLE public.hub_products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'construction'));

-- Update existing products to active
UPDATE public.hub_products SET status = 'active' WHERE status IS NULL;

-- Ensure grants are present for the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_products TO authenticated;
GRANT ALL ON public.hub_products TO service_role;
GRANT SELECT ON public.hub_products TO anon;

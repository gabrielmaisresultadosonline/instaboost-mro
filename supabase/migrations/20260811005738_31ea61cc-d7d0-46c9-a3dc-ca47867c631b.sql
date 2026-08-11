-- Ensure the plan_type column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hub_products' AND column_name = 'plan_type') THEN
        ALTER TABLE public.hub_products ADD COLUMN plan_type TEXT DEFAULT 'vitalicio';
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_products TO authenticated;
GRANT SELECT ON public.hub_products TO anon;
GRANT ALL ON public.hub_products TO service_role;

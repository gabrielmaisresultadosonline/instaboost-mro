GRANT ALL ON public.hub_products TO authenticated, service_role;
GRANT SELECT ON public.hub_products TO anon;

ALTER TABLE public.hub_products ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hub_products' AND policyname = 'Allow public read access on hub_products') THEN
        CREATE POLICY "Allow public read access on hub_products" ON public.hub_products FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hub_products' AND policyname = 'Allow service_role full access on hub_products') THEN
        CREATE POLICY "Allow service_role full access on hub_products" ON public.hub_products FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hub_products' AND policyname = 'Allow authenticated to manage hub_products') THEN
        CREATE POLICY "Allow authenticated to manage hub_products" ON public.hub_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

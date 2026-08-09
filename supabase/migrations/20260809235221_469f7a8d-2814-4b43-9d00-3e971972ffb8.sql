-- Permissões de esquema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant total na tabela para todos os papéis (incluindo anon para testes em VPS)
GRANT ALL ON TABLE public.hub_product_ebooks TO anon, authenticated, service_role;

-- Recriar política de RLS para ser totalmente aberta durante esta fase de correção
-- Isso garante que mesmo sem o cabeçalho de auth correto (comum em problemas de proxy/VPS), o banco aceite.
DROP POLICY IF EXISTS "Allow authenticated access" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Allow public select" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Global Open Access for Ebooks" ON public.hub_product_ebooks;

CREATE POLICY "Global Open Access for Ebooks"
ON public.hub_product_ebooks
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Garantir que a tabela existe com as colunas corretas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hub_product_ebooks') THEN
        CREATE TABLE public.hub_product_ebooks (
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
    END IF;
END $$;

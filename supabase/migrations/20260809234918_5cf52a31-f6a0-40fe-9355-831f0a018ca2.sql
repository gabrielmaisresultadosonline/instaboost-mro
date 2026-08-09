-- 1. Definitivamente garantir acesso total à tabela para todos os papéis necessários
GRANT ALL ON TABLE public.hub_product_ebooks TO postgres, authenticated, service_role, anon;

-- 2. Garantir que o RLS está ativo
ALTER TABLE public.hub_product_ebooks ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas antigas e criar uma única política global permissiva para a tabela
DROP POLICY IF EXISTS "Management policy for hub_product_ebooks" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.hub_product_ebooks;
DROP POLICY IF EXISTS "Allow public select" ON public.hub_product_ebooks;

-- Política de acesso total para usuários autenticados (Admin)
CREATE POLICY "Allow authenticated access"
ON public.hub_product_ebooks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política de leitura pública (necessária para a área de membros exibir o conteúdo)
CREATE POLICY "Allow public select"
ON public.hub_product_ebooks
FOR SELECT
TO public
USING (true);

-- 4. STORAGE FIXES (SQL apenas para políticas, não para buckets)
-- Garantir que usuários autenticados possam fazer TUDO no bucket assets
DROP POLICY IF EXISTS "Allow authenticated uploads to ebooks" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to ebooks" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;

-- Leitura pública para arquivos no bucket assets
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Permissão total para usuários autenticados (Admin) no bucket assets
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'assets')
WITH CHECK (bucket_id = 'assets');

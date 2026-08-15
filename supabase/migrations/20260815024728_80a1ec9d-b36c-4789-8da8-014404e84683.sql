
-- Política para permitir que qualquer pessoa (mesmo sem estar logada no Supabase, já que usamos HMAC/Service Role) possa ver as imagens se forem públicas
CREATE POLICY "Public Access for lotargrupos videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'lotargrupos');

-- Política para permitir uploads no bucket public para a pasta lotargrupos
-- O painel admin usa a anon key mas a RLS do storage pode estar bloqueando se não houver política
CREATE POLICY "Admin Upload Access for lotargrupos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = 'lotargrupos');

CREATE POLICY "Admin Update Access for lotargrupos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'lotargrupos');

CREATE POLICY "Admin Delete Access for lotargrupos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'lotargrupos');

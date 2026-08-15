
-- Política para permitir que qualquer pessoa possa ver os objetos no bucket public
CREATE POLICY "Public Access for public bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- Política para permitir uploads (INSERT) no bucket public
-- O painel admin usa a anon key
CREATE POLICY "Public Upload Access for public bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'public');

-- Política para permitir atualizações (UPDATE)
CREATE POLICY "Public Update Access for public bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'public');

-- Política para permitir exclusões (DELETE)
CREATE POLICY "Public Delete Access for public bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'public');

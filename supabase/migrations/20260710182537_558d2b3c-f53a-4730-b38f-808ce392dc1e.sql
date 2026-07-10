
DO $$ BEGIN
  DROP POLICY IF EXISTS "rendasaovivo public upload" ON storage.objects;
  DROP POLICY IF EXISTS "rendasaovivo public update" ON storage.objects;
  DROP POLICY IF EXISTS "rendasaovivo public read" ON storage.objects;
END $$;

CREATE POLICY "rendasaovivo public upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'assets' AND (name LIKE 'rendasaovivo/%'));

CREATE POLICY "rendasaovivo public update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'assets' AND (name LIKE 'rendasaovivo/%'))
WITH CHECK (bucket_id = 'assets' AND (name LIKE 'rendasaovivo/%'));

CREATE POLICY "rendasaovivo public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'assets' AND (name LIKE 'rendasaovivo/%'));

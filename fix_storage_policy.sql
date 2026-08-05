-- Check if bucket exists and is public, if not create/update
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies for the 'assets' bucket to avoid conflicts
-- Note: We use DO blocks for safer execution if policies don't exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Assets are public" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload assets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can update assets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can delete assets" ON storage.objects;
END $$;

-- Create new comprehensive policies for the 'assets' bucket
CREATE POLICY "Assets are public" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets');

CREATE POLICY "Anyone can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Anyone can update assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'assets');

CREATE POLICY "Anyone can delete assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'assets');

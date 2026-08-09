-- Enable RLS and Table Creation for Audiobook Hub
CREATE TABLE IF NOT EXISTS public.hub_product_ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.hub_products(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    audio_url TEXT,
    ebook_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_product_ebooks TO authenticated;
GRANT ALL ON public.hub_product_ebooks TO service_role;
GRANT SELECT ON public.hub_product_ebooks TO anon;

-- Enable RLS
ALTER TABLE public.hub_product_ebooks ENABLE ROW LEVEL SECURITY;

-- Policies for hub_product_ebooks
CREATE POLICY "Public Read access for ebooks" ON public.hub_product_ebooks FOR SELECT USING (true);
CREATE POLICY "Service Role full access for ebooks" ON public.hub_product_ebooks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ensure hub_products has the new columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hub_products' AND COLUMN_NAME = 'is_ebook_hub') THEN
        ALTER TABLE public.hub_products ADD COLUMN is_ebook_hub BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'hub_products' AND COLUMN_NAME = 'badge_text') THEN
        ALTER TABLE public.hub_products ADD COLUMN badge_text TEXT;
    END IF;
END $$;

-- Seed the new Audiobook product
INSERT INTO public.hub_products (slug, title, description, thumb_url, price, access_source, order_index, is_active, status, is_ebook_hub, badge_text)
VALUES (
    'segredo-vender-mais', 
    'O SEGREDO PARA VENDER MAIS !', 
    'Acesso exclusivo aos 4 Audibooks que vão transformar seus resultados.', 
    'https://ig-mro-boost.lovable.app/lovable-uploads/2569502b-a4be-4796-905c-02cf4c3b28b6.png', 
    37.00, 
    'manual', 
    5, 
    true, 
    'active', 
    true, 
    'EBOOK/AUDIOBOOK'
)
ON CONFLICT (slug) DO UPDATE SET 
    is_ebook_hub = EXCLUDED.is_ebook_hub,
    badge_text = EXCLUDED.badge_text,
    title = EXCLUDED.title;

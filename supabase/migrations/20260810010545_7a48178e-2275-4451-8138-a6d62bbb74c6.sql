CREATE TABLE IF NOT EXISTS public.audiobooks_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    name text,
    whatsapp text,
    amount numeric NOT NULL,
    order_nsu text UNIQUE,
    status text DEFAULT 'pending',
    has_bump_lifetime boolean DEFAULT false,
    has_bump_profile_analysis boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audiobooks_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audiobooks_orders TO anon;
GRANT ALL ON public.audiobooks_orders TO service_role;

ALTER TABLE public.audiobooks_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to audiobooks_orders"
ON public.audiobooks_orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);
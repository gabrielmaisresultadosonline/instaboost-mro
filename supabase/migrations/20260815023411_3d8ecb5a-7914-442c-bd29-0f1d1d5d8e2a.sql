ALTER TABLE public.zapmro_orders ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.zapmro_orders ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.zapmro_orders ADD COLUMN IF NOT EXISTS client_ip TEXT;

GRANT ALL ON public.zapmro_orders TO authenticated;
GRANT ALL ON public.zapmro_orders TO service_role;
GRANT SELECT ON public.zapmro_orders TO anon;
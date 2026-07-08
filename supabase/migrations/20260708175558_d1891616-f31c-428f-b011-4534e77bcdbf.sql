
CREATE TABLE public.postscomia_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 97.00,
  orderbump BOOLEAN NOT NULL DEFAULT false,
  nsu_order TEXT UNIQUE NOT NULL,
  infinitepay_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.postscomia_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postscomia_orders TO authenticated;
GRANT ALL ON public.postscomia_orders TO service_role;
ALTER TABLE public.postscomia_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read paid check" ON public.postscomia_orders FOR SELECT USING (true);
CREATE INDEX idx_postscomia_orders_email ON public.postscomia_orders(email);
CREATE INDEX idx_postscomia_orders_nsu ON public.postscomia_orders(nsu_order);
CREATE INDEX idx_postscomia_orders_status ON public.postscomia_orders(status);
CREATE TRIGGER trg_postscomia_orders_updated_at
  BEFORE UPDATE ON public.postscomia_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

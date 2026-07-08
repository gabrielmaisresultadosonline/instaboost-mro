
ALTER TABLE public.postscomia_orders
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS access_granted BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.postscomia_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  video_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.postscomia_modules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postscomia_modules TO authenticated;
GRANT ALL ON public.postscomia_modules TO service_role;

ALTER TABLE public.postscomia_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active modules" ON public.postscomia_modules
  FOR SELECT USING (is_active = true);

CREATE TRIGGER trg_postscomia_modules_updated_at
  BEFORE UPDATE ON public.postscomia_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.postsprompts_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  kiwify_order_id TEXT,
  kiwify_event TEXT,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.postsprompts_buyers TO service_role;

ALTER TABLE public.postsprompts_buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.postsprompts_buyers
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_postsprompts_buyers_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_postsprompts_buyers_updated_at
BEFORE UPDATE ON public.postsprompts_buyers
FOR EACH ROW EXECUTE FUNCTION public.update_postsprompts_buyers_updated_at();


CREATE TABLE IF NOT EXISTS public.estrutura4_discount_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  emails_sent_count integer NOT NULL DEFAULT 0,
  last_email_sent_at timestamptz,
  accessed_discount_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.estrutura4_discount_leads TO service_role;
ALTER TABLE public.estrutura4_discount_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access leads" ON public.estrutura4_discount_leads FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.estrutura4_discount_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  email text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.estrutura4_discount_visits TO service_role;
ALTER TABLE public.estrutura4_discount_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access visits" ON public.estrutura4_discount_visits FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_est4_leads_token ON public.estrutura4_discount_leads(token);
CREATE INDEX IF NOT EXISTS idx_est4_leads_email ON public.estrutura4_discount_leads(email);
CREATE INDEX IF NOT EXISTS idx_est4_visits_created ON public.estrutura4_discount_visits(created_at DESC);

CREATE TRIGGER trg_est4_leads_updated_at
BEFORE UPDATE ON public.estrutura4_discount_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

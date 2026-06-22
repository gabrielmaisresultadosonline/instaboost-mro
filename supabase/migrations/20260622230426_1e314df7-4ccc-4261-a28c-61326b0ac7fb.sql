CREATE TABLE public.renda_extrass_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  has_desktop BOOLEAN NOT NULL DEFAULT false,
  video_completed BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX renda_extrass_leads_email_key ON public.renda_extrass_leads (lower(email));

GRANT SELECT, INSERT, UPDATE ON public.renda_extrass_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renda_extrass_leads TO authenticated;
GRANT ALL ON public.renda_extrass_leads TO service_role;

ALTER TABLE public.renda_extrass_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert renda_extrass leads"
  ON public.renda_extrass_leads FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public can read renda_extrass leads"
  ON public.renda_extrass_leads FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can update renda_extrass leads"
  ON public.renda_extrass_leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_renda_extrass_leads_updated_at
BEFORE UPDATE ON public.renda_extrass_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
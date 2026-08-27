CREATE TABLE public.zapzap_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_zapzap_leads_created_at ON public.zapzap_leads(created_at DESC);
GRANT ALL ON public.zapzap_leads TO service_role;
ALTER TABLE public.zapzap_leads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.zapzap_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.zapzap_settings TO service_role;
ALTER TABLE public.zapzap_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.zapzap_settings (grupo_link) VALUES ('');
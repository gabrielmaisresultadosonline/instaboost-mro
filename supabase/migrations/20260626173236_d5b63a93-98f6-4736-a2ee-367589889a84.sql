
CREATE TABLE public.comercialaaf_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  empresa TEXT NOT NULL,
  o_que_vende TEXT,
  faturamento TEXT NOT NULL,
  email_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.comercialaaf_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercialaaf_leads TO authenticated;
GRANT ALL ON public.comercialaaf_leads TO service_role;
ALTER TABLE public.comercialaaf_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can insert" ON public.comercialaaf_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service all" ON public.comercialaaf_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

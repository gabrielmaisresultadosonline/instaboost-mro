
CREATE TABLE public.localvpp_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT NOT NULL,
  business_type TEXT NOT NULL,
  device_type TEXT NOT NULL,
  instagram TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.localvpp_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localvpp_leads TO authenticated;
GRANT ALL ON public.localvpp_leads TO service_role;
ALTER TABLE public.localvpp_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert leads" ON public.localvpp_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role manages leads" ON public.localvpp_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

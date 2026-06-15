CREATE TABLE IF NOT EXISTS public.estrutura4_remarketing_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  nome text,
  whatsapp text,
  tipo_computador text,
  source_page text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  link text,
  success boolean NOT NULL DEFAULT true,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_est4_remarketing_email ON public.estrutura4_remarketing_logs(email);
CREATE INDEX IF NOT EXISTS idx_est4_remarketing_sent_at ON public.estrutura4_remarketing_logs(sent_at DESC);
GRANT ALL ON public.estrutura4_remarketing_logs TO service_role;
ALTER TABLE public.estrutura4_remarketing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access remarketing" ON public.estrutura4_remarketing_logs
  TO anon, authenticated USING (false) WITH CHECK (false);
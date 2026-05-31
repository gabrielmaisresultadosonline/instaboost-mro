
-- Tabelas separadas para o público /rendaextralead

CREATE TABLE public.renda_extra_lead_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  trabalha_atualmente boolean DEFAULT false,
  media_salarial text NOT NULL,
  tipo_computador text NOT NULL,
  instagram_username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  email_confirmacao_enviado boolean DEFAULT false,
  email_confirmacao_enviado_at timestamptz,
  email_lembrete_enviado boolean DEFAULT false,
  email_lembrete_enviado_at timestamptz
);
GRANT INSERT ON public.renda_extra_lead_leads TO anon;
GRANT INSERT, SELECT ON public.renda_extra_lead_leads TO authenticated;
GRANT ALL ON public.renda_extra_lead_leads TO service_role;
ALTER TABLE public.renda_extra_lead_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register lead" ON public.renda_extra_lead_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role manage leads" ON public.renda_extra_lead_leads FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.renda_extra_lead_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  source_url text,
  user_agent text,
  device_type text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.renda_extra_lead_analytics TO anon;
GRANT INSERT, SELECT ON public.renda_extra_lead_analytics TO authenticated;
GRANT ALL ON public.renda_extra_lead_analytics TO service_role;
ALTER TABLE public.renda_extra_lead_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can track visits lead" ON public.renda_extra_lead_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role view analytics lead" ON public.renda_extra_lead_analytics FOR SELECT
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage analytics lead" ON public.renda_extra_lead_analytics FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.renda_extra_lead_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_group_link text,
  launch_date timestamptz DEFAULT '2026-01-21 09:00:00+00',
  launch_date_enabled boolean DEFAULT false,
  admin_email text DEFAULT 'mro@gmail.com',
  admin_password text DEFAULT 'Ga145523@',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.renda_extra_lead_settings TO service_role;
ALTER TABLE public.renda_extra_lead_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manage settings lead" ON public.renda_extra_lead_settings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
INSERT INTO public.renda_extra_lead_settings (admin_email, admin_password) VALUES ('mro@gmail.com', 'Ga145523@');

CREATE TABLE public.renda_extra_lead_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.renda_extra_lead_leads(id) ON DELETE CASCADE,
  email_to text NOT NULL,
  email_type text NOT NULL,
  subject text,
  status text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.renda_extra_lead_email_logs TO service_role;
ALTER TABLE public.renda_extra_lead_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manage email logs lead" ON public.renda_extra_lead_email_logs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

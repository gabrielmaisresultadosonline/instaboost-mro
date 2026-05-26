
-- Empresas: leads, settings, email logs
CREATE TABLE public.empresas_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  tem_empresa TEXT,
  vende_produto TEXT,
  presta_servico TEXT,
  iniciando_digital TEXT,
  marca_e_passa TEXT,
  email_confirmacao_enviado BOOLEAN DEFAULT false,
  email_confirmacao_enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_leads TO authenticated;
GRANT ALL ON public.empresas_leads TO service_role;
ALTER TABLE public.empresas_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages empresas_leads" ON public.empresas_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.empresas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_group_link TEXT NOT NULL DEFAULT 'https://chat.whatsapp.com/example',
  page_title TEXT DEFAULT 'Aprenda grátis como a MRO pode te ajudar no seu negócio!',
  page_subtitle TEXT DEFAULT 'Grupo Especial para empresas, pequenos negócios, vendedores e prestadores de serviço que precisam crescer no digital de forma real e constante.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_settings TO authenticated;
GRANT SELECT ON public.empresas_settings TO anon;
GRANT ALL ON public.empresas_settings TO service_role;
ALTER TABLE public.empresas_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read empresas_settings" ON public.empresas_settings
  FOR SELECT USING (true);
CREATE POLICY "Service role manages empresas_settings" ON public.empresas_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.empresas_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.empresas_leads(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.empresas_email_logs TO authenticated;
GRANT ALL ON public.empresas_email_logs TO service_role;
ALTER TABLE public.empresas_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages empresas_email_logs" ON public.empresas_email_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER empresas_leads_updated_at
  BEFORE UPDATE ON public.empresas_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER empresas_settings_updated_at
  BEFORE UPDATE ON public.empresas_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.empresas_settings (whatsapp_group_link) VALUES ('https://chat.whatsapp.com/example');

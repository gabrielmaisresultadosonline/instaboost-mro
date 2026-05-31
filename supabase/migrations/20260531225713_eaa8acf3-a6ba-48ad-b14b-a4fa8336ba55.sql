
CREATE TABLE public.livve_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'Fazendo 5k com a MRO'::text,
  description text,
  video_url text,
  status text NOT NULL DEFAULT 'active'::text,
  fake_viewers_min integer NOT NULL DEFAULT 14,
  fake_viewers_max integer NOT NULL DEFAULT 200,
  whatsapp_group_link text,
  cta_title text DEFAULT 'Fature mais de 5k prestando serviço para as empresas'::text,
  cta_description text DEFAULT 'Rode a ferramenta na sua maquina/notebook/pc e cobre mensalmente das empresas por isso. Receba todo o passo a passo de como fechar contratos, de como apresentar esse serviço e como faturar de verdade.'::text,
  cta_button_text text DEFAULT 'Acesse o GRUPO para liberar o desconto'::text,
  cta_button_link text,
  hls_url text,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.livve_sessions TO anon;
GRANT SELECT ON public.livve_sessions TO authenticated;
GRANT ALL ON public.livve_sessions TO service_role;

ALTER TABLE public.livve_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active livve"
  ON public.livve_sessions FOR SELECT USING (true);

CREATE POLICY "Service role full access on livve_sessions"
  ON public.livve_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE public.livve_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email text NOT NULL DEFAULT 'mro@gmail.com'::text,
  admin_password text NOT NULL DEFAULT 'Ga145523@'::text,
  default_whatsapp_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.livve_settings TO service_role;

ALTER TABLE public.livve_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on livve_settings"
  ON public.livve_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.livve_settings (admin_email, admin_password) VALUES ('mro@gmail.com', 'Ga145523@');

CREATE TABLE public.livve_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.livve_sessions(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  watch_percentage integer NOT NULL DEFAULT 0,
  device_type text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.livve_analytics TO anon;
GRANT SELECT, INSERT, UPDATE ON public.livve_analytics TO authenticated;
GRANT ALL ON public.livve_analytics TO service_role;

ALTER TABLE public.livve_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert livve analytics"
  ON public.livve_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update livve analytics"
  ON public.livve_analytics FOR UPDATE USING (true);

CREATE POLICY "Service role full access on livve_analytics"
  ON public.livve_analytics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

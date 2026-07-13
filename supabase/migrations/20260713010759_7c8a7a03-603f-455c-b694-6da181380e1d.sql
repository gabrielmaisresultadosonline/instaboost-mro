
-- SETTINGS
CREATE TABLE public.salaobel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_group_link TEXT NOT NULL DEFAULT '',
  aula_data TEXT NOT NULL DEFAULT '18/07',
  aula_titulo TEXT NOT NULL DEFAULT 'Aula Ao Vivo - Salão Bel',
  preco NUMERIC NOT NULL DEFAULT 19,
  hero_video_url TEXT NOT NULL DEFAULT '',
  hero_video_hls_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.salaobel_settings TO service_role;
ALTER TABLE public.salaobel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salaobel_settings service only" ON public.salaobel_settings FOR ALL USING (false);

-- ORDERS
CREATE TABLE public.salaobel_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 19,
  nsu_order TEXT NOT NULL UNIQUE,
  infinitepay_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  fbc TEXT,
  fbp TEXT,
  user_agent TEXT,
  pixel_sent BOOLEAN DEFAULT false,
  pixel_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.salaobel_orders TO service_role;
ALTER TABLE public.salaobel_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salaobel_orders service only" ON public.salaobel_orders FOR ALL USING (false);

-- VISITS
CREATE TABLE public.salaobel_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.salaobel_visits TO service_role;
ALTER TABLE public.salaobel_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salaobel_visits service only" ON public.salaobel_visits FOR ALL USING (false);

-- EMAIL LOGS
CREATE TABLE public.salaobel_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.salaobel_email_logs TO service_role;
ALTER TABLE public.salaobel_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salaobel_email_logs service only" ON public.salaobel_email_logs FOR ALL USING (false);

-- updated_at triggers
CREATE TRIGGER salaobel_settings_updated_at BEFORE UPDATE ON public.salaobel_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER salaobel_orders_updated_at BEFORE UPDATE ON public.salaobel_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.salaobel_settings (whatsapp_group_link, aula_data, aula_titulo, preco)
VALUES ('', '18/07', 'Aula Ao Vivo - Salão Bel', 19);

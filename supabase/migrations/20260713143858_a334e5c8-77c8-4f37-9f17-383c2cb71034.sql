
CREATE TABLE public.localvpp_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  amount numeric NOT NULL DEFAULT 10,
  nsu_order text NOT NULL,
  infinitepay_link text,
  status text NOT NULL DEFAULT 'pending',
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  paid_at timestamptz,
  expired_at timestamptz,
  fbc text, fbp text, user_agent text,
  pixel_sent boolean DEFAULT false,
  pixel_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.localvpp_orders TO service_role;
ALTER TABLE public.localvpp_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_localvpp_orders" ON public.localvpp_orders TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.localvpp_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_group_link text NOT NULL DEFAULT '',
  aula_data text NOT NULL DEFAULT '20/07',
  aula_titulo text NOT NULL DEFAULT 'Aula Ao Vivo - LocalVPP',
  preco numeric NOT NULL DEFAULT 10,
  hero_video_url text NOT NULL DEFAULT '',
  hero_video_hls_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.localvpp_settings TO service_role;
ALTER TABLE public.localvpp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_localvpp_settings" ON public.localvpp_settings TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.localvpp_settings (whatsapp_group_link, aula_data, preco) VALUES ('', '20/07', 10);

CREATE TABLE public.localvpp_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text, user_agent text, referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.localvpp_visits TO service_role;
ALTER TABLE public.localvpp_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_localvpp_visits" ON public.localvpp_visits TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.localvpp_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_to text NOT NULL,
  email_type text NOT NULL,
  subject text,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.localvpp_email_logs TO service_role;
ALTER TABLE public.localvpp_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_localvpp_email_logs" ON public.localvpp_email_logs TO service_role USING (true) WITH CHECK (true);

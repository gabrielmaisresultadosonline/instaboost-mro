
CREATE TABLE public.delivery_orders (LIKE public.salaobel_orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
ALTER TABLE public.delivery_orders ADD PRIMARY KEY (id);

CREATE TABLE public.delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_group_link text NOT NULL DEFAULT '',
  aula_data text NOT NULL DEFAULT '18/07',
  aula_titulo text NOT NULL DEFAULT 'Aula Ao Vivo - Delivery',
  preco numeric NOT NULL DEFAULT 19,
  hero_video_url text NOT NULL DEFAULT '',
  hero_video_hls_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_to text NOT NULL,
  email_type text NOT NULL,
  subject text,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.delivery_orders TO service_role;
GRANT ALL ON public.delivery_settings TO service_role;
GRANT ALL ON public.delivery_visits TO service_role;
GRANT ALL ON public.delivery_email_logs TO service_role;

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_delivery_orders" ON public.delivery_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_delivery_settings" ON public.delivery_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_delivery_visits" ON public.delivery_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_delivery_email_logs" ON public.delivery_email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.delivery_settings (aula_titulo, aula_data, preco) VALUES ('Aula Ao Vivo - Delivery', '18/07', 19);

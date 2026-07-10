
CREATE TABLE public.rendasaovivo_orders (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.rendasaovivo_orders TO service_role;
ALTER TABLE public.rendasaovivo_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.rendasaovivo_orders FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.rendasaovivo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_group_link TEXT NOT NULL DEFAULT '',
  aula_data TEXT NOT NULL DEFAULT '18/07',
  aula_titulo TEXT NOT NULL DEFAULT 'Aula Ao Vivo - Renda Ao Vivo',
  preco NUMERIC NOT NULL DEFAULT 19,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.rendasaovivo_settings TO service_role;
ALTER TABLE public.rendasaovivo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.rendasaovivo_settings FOR ALL USING (false) WITH CHECK (false);
INSERT INTO public.rendasaovivo_settings (whatsapp_group_link) VALUES ('');

CREATE TABLE public.rendasaovivo_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.rendasaovivo_visits TO service_role;
ALTER TABLE public.rendasaovivo_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.rendasaovivo_visits FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.rendasaovivo_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.rendasaovivo_email_logs TO service_role;
ALTER TABLE public.rendasaovivo_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.rendasaovivo_email_logs FOR ALL USING (false) WITH CHECK (false);

CREATE TRIGGER update_rendasaovivo_orders_updated_at BEFORE UPDATE ON public.rendasaovivo_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rendasaovivo_settings_updated_at BEFORE UPDATE ON public.rendasaovivo_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

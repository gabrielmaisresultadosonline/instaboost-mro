CREATE TABLE IF NOT EXISTS public.vender_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_vip_link text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.vender_settings TO anon, authenticated;
GRANT ALL ON public.vender_settings TO service_role;

ALTER TABLE public.vender_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vender_settings public read"
ON public.vender_settings FOR SELECT
USING (true);

CREATE POLICY "vender_settings public write"
ON public.vender_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "vender_settings public update"
ON public.vender_settings FOR UPDATE
USING (true) WITH CHECK (true);

CREATE TRIGGER vender_settings_updated_at
BEFORE UPDATE ON public.vender_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.vender_settings (grupo_vip_link) VALUES ('https://chat.whatsapp.com/');

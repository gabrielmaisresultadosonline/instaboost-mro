CREATE TABLE IF NOT EXISTS public.postsprompts_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openai_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.postsprompts_settings TO service_role;

ALTER TABLE public.postsprompts_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny all to public" ON public.postsprompts_settings FOR ALL USING (false) WITH CHECK (false);

INSERT INTO public.postsprompts_settings (openai_api_key) VALUES (NULL)
ON CONFLICT DO NOTHING;
ALTER TABLE public.desconto_alunos_settings 
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS hls_url text,
  ADD COLUMN IF NOT EXISTS video_title text;

INSERT INTO public.desconto_alunos_settings (is_active)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.desconto_alunos_settings);

GRANT SELECT ON public.desconto_alunos_settings TO anon, authenticated;
GRANT ALL ON public.desconto_alunos_settings TO service_role;
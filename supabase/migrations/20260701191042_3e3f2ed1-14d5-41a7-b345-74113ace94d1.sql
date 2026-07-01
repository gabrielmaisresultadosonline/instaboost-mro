CREATE TABLE IF NOT EXISTS public.ferramentamropromo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT,
  hls_url TEXT,
  video_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferramentamropromo_settings TO authenticated;
GRANT SELECT ON public.ferramentamropromo_settings TO anon;
GRANT ALL ON public.ferramentamropromo_settings TO service_role;

ALTER TABLE public.ferramentamropromo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ferramentamropromo settings"
  ON public.ferramentamropromo_settings FOR SELECT
  USING (true);
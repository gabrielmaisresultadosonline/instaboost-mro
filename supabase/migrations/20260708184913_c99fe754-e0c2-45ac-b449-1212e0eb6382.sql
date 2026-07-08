
-- SETTINGS
CREATE TABLE IF NOT EXISTS public.postscomia_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_video_url text,
  hero_video_poster text,
  fb_pixel_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.postscomia_settings TO anon, authenticated;
GRANT ALL ON public.postscomia_settings TO service_role;
ALTER TABLE public.postscomia_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postscomia_settings public read" ON public.postscomia_settings FOR SELECT USING (true);
CREATE TRIGGER trg_postscomia_settings_updated_at BEFORE UPDATE ON public.postscomia_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.postscomia_settings (hero_video_url, hero_video_poster, fb_pixel_id) VALUES (NULL, NULL, NULL);

-- ANALYTICS
CREATE TABLE IF NOT EXISTS public.postscomia_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('page_visit','video_start','video_25','video_50','video_75','video_100')),
  video_id text,
  video_title text,
  session_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.postscomia_analytics TO anon, authenticated;
GRANT ALL ON public.postscomia_analytics TO service_role;
ALTER TABLE public.postscomia_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postscomia_analytics public insert" ON public.postscomia_analytics FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_postscomia_analytics_event ON public.postscomia_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_postscomia_analytics_video ON public.postscomia_analytics(video_id);

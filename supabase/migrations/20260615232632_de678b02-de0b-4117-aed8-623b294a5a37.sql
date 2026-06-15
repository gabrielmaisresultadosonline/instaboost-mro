
-- Leads table
CREATE TABLE public.instagrammnew_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  emails_sent_count INT NOT NULL DEFAULT 0,
  last_email_sent_at TIMESTAMPTZ,
  accessed_page_at TIMESTAMPTZ,
  source TEXT,
  auto_remarketing_enabled BOOLEAN NOT NULL DEFAULT true,
  remarketing_stage INT NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagrammnew_leads TO authenticated;
GRANT ALL ON public.instagrammnew_leads TO service_role;
ALTER TABLE public.instagrammnew_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access instagrammnew_leads" ON public.instagrammnew_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER instagrammnew_leads_updated BEFORE UPDATE ON public.instagrammnew_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video access log
CREATE TABLE public.instagrammnew_video_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_progress_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_milestone TEXT,
  milestones_sent JSONB NOT NULL DEFAULT '{}'::jsonb,
  abandoned_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagrammnew_video_log TO authenticated;
GRANT ALL ON public.instagrammnew_video_log TO service_role;
ALTER TABLE public.instagrammnew_video_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access instagrammnew_video_log" ON public.instagrammnew_video_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER instagrammnew_video_log_updated BEFORE UPDATE ON public.instagrammnew_video_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video config
CREATE TABLE public.instagrammnew_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT,
  hls_url TEXT,
  video_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagrammnew_settings TO authenticated;
GRANT ALL ON public.instagrammnew_settings TO service_role;
ALTER TABLE public.instagrammnew_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access instagrammnew_settings" ON public.instagrammnew_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER instagrammnew_settings_updated BEFORE UPDATE ON public.instagrammnew_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

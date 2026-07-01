
CREATE TABLE IF NOT EXISTS public.ferramentamropromo_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  progress_pct INTEGER,
  user_agent TEXT,
  referrer TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmp_analytics_created_at ON public.ferramentamropromo_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fmp_analytics_visitor ON public.ferramentamropromo_analytics (visitor_id);
CREATE INDEX IF NOT EXISTS idx_fmp_analytics_event ON public.ferramentamropromo_analytics (event_type);

GRANT ALL ON public.ferramentamropromo_analytics TO service_role;

ALTER TABLE public.ferramentamropromo_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fmp_analytics_service_only" ON public.ferramentamropromo_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

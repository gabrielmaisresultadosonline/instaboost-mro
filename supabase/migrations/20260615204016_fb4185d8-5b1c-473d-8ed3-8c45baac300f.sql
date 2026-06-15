
CREATE TABLE IF NOT EXISTS public.estrutura4_discount_video_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  last_progress_at timestamptz NOT NULL DEFAULT now(),
  last_milestone text NOT NULL DEFAULT 'access',
  milestones_sent jsonb NOT NULL DEFAULT '{}'::jsonb,
  abandoned_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.estrutura4_discount_video_log TO service_role;

ALTER TABLE public.estrutura4_discount_video_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only video log"
  ON public.estrutura4_discount_video_log
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_estrutura4_video_log_last_progress
  ON public.estrutura4_discount_video_log (last_progress_at);

CREATE TRIGGER trg_estrutura4_video_log_updated_at
  BEFORE UPDATE ON public.estrutura4_discount_video_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

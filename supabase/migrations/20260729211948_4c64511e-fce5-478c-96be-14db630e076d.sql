CREATE TABLE public.hub_merge_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_email TEXT NOT NULL,
  primary_username TEXT,
  primary_tool TEXT,
  reason TEXT,
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  reverted BOOLEAN NOT NULL DEFAULT false,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.hub_merge_logs TO service_role;

ALTER TABLE public.hub_merge_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_hub_merge_logs_created_at ON public.hub_merge_logs (created_at DESC);
CREATE INDEX idx_hub_merge_logs_email ON public.hub_merge_logs (target_email);
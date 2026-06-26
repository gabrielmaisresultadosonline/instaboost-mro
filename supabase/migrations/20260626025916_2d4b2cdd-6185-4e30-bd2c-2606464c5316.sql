
ALTER TABLE public.renda_extra_lead_leads
  ADD COLUMN IF NOT EXISTS desconto_last_access_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desconto_video_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS desconto_email_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_renda_extra_lead_leads_email_lower ON public.renda_extra_lead_leads ((lower(email)));

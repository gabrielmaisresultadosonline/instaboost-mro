
ALTER TABLE public.renda_extrass_leads
  ADD COLUMN IF NOT EXISTS video_25_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_50_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_100_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder1_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder2_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_expired boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_renda_extrass_offer_expires ON public.renda_extrass_leads(offer_expires_at) WHERE offer_email_sent_at IS NOT NULL AND offer_expired = false;

ALTER TABLE public.renda_extra_lead_leads
ADD COLUMN IF NOT EXISTS promo_video_percent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_video_last_watched_at timestamptz;
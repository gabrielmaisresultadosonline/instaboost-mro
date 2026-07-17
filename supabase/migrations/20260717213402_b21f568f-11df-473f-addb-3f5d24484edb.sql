
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS squarecloud_username TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX IF NOT EXISTS idx_partners_squarecloud ON public.partners(squarecloud_username);
CREATE INDEX IF NOT EXISTS idx_partners_source ON public.partners(source);

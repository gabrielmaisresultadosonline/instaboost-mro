ALTER TABLE public.mktcc_projects
  ADD COLUMN IF NOT EXISTS before_profile_full_url TEXT NOT NULL DEFAULT '';
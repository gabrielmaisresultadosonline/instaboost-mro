ALTER TABLE public.mktcc_projects
  ADD COLUMN IF NOT EXISTS logo_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_before_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_after_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS logo_client_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_reviewed_at timestamptz;
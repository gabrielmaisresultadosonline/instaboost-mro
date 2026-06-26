ALTER TABLE public.renda_extra_lead_leads
  ADD COLUMN IF NOT EXISTS lead_source text NOT NULL DEFAULT 'renda_extra';
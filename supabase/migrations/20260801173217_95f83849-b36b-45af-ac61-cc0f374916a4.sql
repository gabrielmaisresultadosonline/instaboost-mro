ALTER TABLE public.mktcc_cycles
  ADD COLUMN IF NOT EXISTS next_steps_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_strategy boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_summary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_before boolean NOT NULL DEFAULT true;
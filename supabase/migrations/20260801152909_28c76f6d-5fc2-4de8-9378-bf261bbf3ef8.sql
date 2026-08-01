ALTER TABLE public.mktcc_cycles
  ADD COLUMN IF NOT EXISTS strategy_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS strategy_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary_text text NOT NULL DEFAULT '';
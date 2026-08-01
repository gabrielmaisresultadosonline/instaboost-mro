CREATE TABLE public.mktcc_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mktcc_projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  scheduled_date date,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  completed_at timestamptz,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.mktcc_cycles TO service_role;

ALTER TABLE public.mktcc_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mktcc_cycles_service" ON public.mktcc_cycles
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_mktcc_cycles_project ON public.mktcc_cycles(project_id, order_index);

CREATE TRIGGER mktcc_cycles_updated_at BEFORE UPDATE ON public.mktcc_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mktcc_posts
  ADD COLUMN cycle_id uuid REFERENCES public.mktcc_cycles(id) ON DELETE SET NULL;

CREATE INDEX idx_mktcc_posts_cycle ON public.mktcc_posts(cycle_id);
CREATE TABLE public.mktcc_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  strategy_title TEXT NOT NULL DEFAULT 'Primeiro passo: Estrutura de Rede Social',
  strategy_text TEXT NOT NULL DEFAULT '',
  summary_text TEXT NOT NULL DEFAULT '',
  next_steps_text TEXT NOT NULL DEFAULT '',
  instagram_handle TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mktcc_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.mktcc_projects(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'image' CHECK (post_type IN ('image','video','carousel')),
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','changes')),
  client_note TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mktcc_posts_project ON public.mktcc_posts(project_id, order_index);

GRANT ALL ON public.mktcc_projects TO service_role;
GRANT ALL ON public.mktcc_posts TO service_role;

ALTER TABLE public.mktcc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mktcc_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mktcc_projects_service" ON public.mktcc_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mktcc_posts_service" ON public.mktcc_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER mktcc_projects_updated_at BEFORE UPDATE ON public.mktcc_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mktcc_posts_updated_at BEFORE UPDATE ON public.mktcc_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
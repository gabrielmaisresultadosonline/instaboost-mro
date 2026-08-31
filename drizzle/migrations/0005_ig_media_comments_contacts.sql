-- Mídias (posts e Reels) sincronizadas da Graph API
CREATE TABLE IF NOT EXISTS public.ig_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  ig_account_id UUID NOT NULL REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  media_type TEXT,
  media_product_type TEXT,
  caption TEXT,
  permalink TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  like_count INTEGER,
  comments_count INTEGER,
  views_count INTEGER,
  reach INTEGER,
  saved INTEGER,
  shares INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ig_account_id, media_id)
);
CREATE INDEX IF NOT EXISTS ig_media_tenant_idx ON public.ig_media (tenant_id, published_at DESC);

-- Comentários recebidos
CREATE TABLE IF NOT EXISTS public.ig_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  ig_account_id UUID NOT NULL REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  media_row_id UUID REFERENCES public.ig_media(id) ON DELETE SET NULL,
  comment_id TEXT NOT NULL,
  media_id TEXT,
  parent_comment_id TEXT,
  from_id TEXT,
  from_username TEXT,
  text TEXT,
  is_own BOOLEAN NOT NULL DEFAULT false,
  replied BOOLEAN NOT NULL DEFAULT false,
  hidden BOOLEAN NOT NULL DEFAULT false,
  commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ig_account_id, comment_id)
);
CREATE INDEX IF NOT EXISTS ig_comments_tenant_idx ON public.ig_comments (tenant_id, commented_at DESC);

-- Contatos / CRM
CREATE TABLE IF NOT EXISTS public.ig_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  ig_account_id UUID NOT NULL REFERENCES public.ig_accounts(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  username TEXT,
  name TEXT,
  picture_url TEXT,
  stage TEXT NOT NULL DEFAULT 'novo' CHECK (stage IN ('novo','contato','qualificado','negociacao','cliente','perdido')),
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','comment','manual')),
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ig_account_id, participant_id)
);
CREATE INDEX IF NOT EXISTS ig_contacts_tenant_idx ON public.ig_contacts (tenant_id, stage, last_interaction_at DESC);

GRANT SELECT ON public.ig_media TO authenticated;
GRANT ALL ON public.ig_media TO service_role;
GRANT SELECT ON public.ig_comments TO authenticated;
GRANT ALL ON public.ig_comments TO service_role;
GRANT SELECT, UPDATE ON public.ig_contacts TO authenticated;
GRANT ALL ON public.ig_contacts TO service_role;

ALTER TABLE public.ig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read tenant media" ON public.ig_media
  FOR SELECT TO authenticated USING (public.ig_is_tenant_member(tenant_id));
CREATE POLICY "Members read tenant comments" ON public.ig_comments
  FOR SELECT TO authenticated USING (public.ig_is_tenant_member(tenant_id));
CREATE POLICY "Members read tenant contacts" ON public.ig_contacts
  FOR SELECT TO authenticated USING (public.ig_is_tenant_member(tenant_id));
CREATE POLICY "Members update tenant contacts" ON public.ig_contacts
  FOR UPDATE TO authenticated USING (public.ig_is_tenant_member(tenant_id))
  WITH CHECK (public.ig_is_tenant_member(tenant_id));

CREATE TRIGGER ig_media_touch BEFORE UPDATE ON public.ig_media
  FOR EACH ROW EXECUTE FUNCTION public.ig_touch_updated_at();
CREATE TRIGGER ig_comments_touch BEFORE UPDATE ON public.ig_comments
  FOR EACH ROW EXECUTE FUNCTION public.ig_touch_updated_at();
CREATE TRIGGER ig_contacts_touch BEFORE UPDATE ON public.ig_contacts
  FOR EACH ROW EXECUTE FUNCTION public.ig_touch_updated_at();
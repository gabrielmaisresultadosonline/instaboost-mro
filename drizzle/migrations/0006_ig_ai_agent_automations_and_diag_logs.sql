-- =========================================================
-- /IG — Agente de IA no Direct, automações e logs de diagnóstico
-- =========================================================

-- 1) Colunas novas em tabelas existentes -------------------
ALTER TABLE public.ig_conversations
  ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_replies_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.ig_messages
  ADD COLUMN IF NOT EXISTS is_ai BOOLEAN NOT NULL DEFAULT false;

-- 2) Configuração do agente de IA por workspace ------------
CREATE TABLE IF NOT EXISTS public.ig_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_reply BOOLEAN NOT NULL DEFAULT false,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  tone TEXT NOT NULL DEFAULT 'profissional e cordial',
  persona TEXT NOT NULL DEFAULT 'Atendente oficial da marca no Instagram',
  business_context TEXT,
  knowledge TEXT,
  greeting TEXT,
  handoff_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_replies_per_conversation INTEGER NOT NULL DEFAULT 5,
  reply_delay_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_ai_settings TO authenticated;
GRANT ALL ON public.ig_ai_settings TO service_role;
ALTER TABLE public.ig_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_ai_settings_member_read" ON public.ig_ai_settings;
CREATE POLICY "ig_ai_settings_member_read" ON public.ig_ai_settings
  FOR SELECT TO authenticated
  USING (public.ig_is_tenant_member(tenant_id) OR public.ig_is_super_admin());

DROP POLICY IF EXISTS "ig_ai_settings_admin_write" ON public.ig_ai_settings;
CREATE POLICY "ig_ai_settings_admin_write" ON public.ig_ai_settings
  FOR ALL TO authenticated
  USING (public.ig_has_tenant_role(tenant_id, ARRAY['owner','admin']::ig_role[]))
  WITH CHECK (public.ig_has_tenant_role(tenant_id, ARRAY['owner','admin']::ig_role[]));

-- 3) Automações por palavra-chave ---------------------------
CREATE TABLE IF NOT EXISTS public.ig_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'direct' CHECK (channel IN ('direct','comment')),
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','exact','any','starts_with')),
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  reply_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  triggered_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ig_automations_tenant_idx ON public.ig_automations(tenant_id, is_active, priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ig_automations TO authenticated;
GRANT ALL ON public.ig_automations TO service_role;
ALTER TABLE public.ig_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_automations_member_read" ON public.ig_automations;
CREATE POLICY "ig_automations_member_read" ON public.ig_automations
  FOR SELECT TO authenticated
  USING (public.ig_is_tenant_member(tenant_id) OR public.ig_is_super_admin());

DROP POLICY IF EXISTS "ig_automations_admin_write" ON public.ig_automations;
CREATE POLICY "ig_automations_admin_write" ON public.ig_automations
  FOR ALL TO authenticated
  USING (public.ig_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::ig_role[]))
  WITH CHECK (public.ig_has_tenant_role(tenant_id, ARRAY['owner','admin','manager']::ig_role[]));

-- 4) Logs técnicos visíveis no painel/terminal --------------
CREATE TABLE IF NOT EXISTS public.ig_diag_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.ig_tenants(id) ON DELETE CASCADE,
  ig_account_id UUID,
  scope TEXT NOT NULL,
  step TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug','info','warn','error')),
  http_status INTEGER,
  duration_ms INTEGER,
  message TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ig_diag_logs_tenant_created_idx ON public.ig_diag_logs(tenant_id, created_at DESC);

GRANT SELECT ON public.ig_diag_logs TO authenticated;
GRANT ALL ON public.ig_diag_logs TO service_role;
ALTER TABLE public.ig_diag_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ig_diag_logs_member_read" ON public.ig_diag_logs;
CREATE POLICY "ig_diag_logs_member_read" ON public.ig_diag_logs
  FOR SELECT TO authenticated
  USING (public.ig_is_tenant_member(tenant_id) OR public.ig_is_super_admin());

-- 5) updated_at automático ---------------------------------
DROP TRIGGER IF EXISTS ig_ai_settings_touch ON public.ig_ai_settings;
CREATE TRIGGER ig_ai_settings_touch BEFORE UPDATE ON public.ig_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.ig_touch_updated_at();

DROP TRIGGER IF EXISTS ig_automations_touch ON public.ig_automations;
CREATE TRIGGER ig_automations_touch BEFORE UPDATE ON public.ig_automations
  FOR EACH ROW EXECUTE FUNCTION public.ig_touch_updated_at();
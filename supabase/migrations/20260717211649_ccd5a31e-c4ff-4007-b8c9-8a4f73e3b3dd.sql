
-- AgenteMRO Phase 1: Core tables

-- Contas (tenants/workspaces)
CREATE TABLE public.agentemro_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  meta_waba_id TEXT,
  meta_phone_number_id TEXT,
  meta_access_token TEXT,
  meta_verify_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentemro_accounts TO authenticated;
GRANT ALL ON public.agentemro_accounts TO service_role;
ALTER TABLE public.agentemro_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own account"
  ON public.agentemro_accounts FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Agentes (AI agents configuration)
CREATE TABLE public.agentemro_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.agentemro_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um atendente cordial e objetivo.',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agentemro_agents_account ON public.agentemro_agents(account_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentemro_agents TO authenticated;
GRANT ALL ON public.agentemro_agents TO service_role;
ALTER TABLE public.agentemro_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage agents in their accounts"
  ON public.agentemro_agents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agentemro_accounts a WHERE a.id = account_id AND a.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agentemro_accounts a WHERE a.id = account_id AND a.owner_user_id = auth.uid()));

-- Conversas
CREATE TABLE public.agentemro_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.agentemro_accounts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agentemro_agents(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paused')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agentemro_conv_account ON public.agentemro_conversations(account_id);
CREATE INDEX idx_agentemro_conv_phone ON public.agentemro_conversations(contact_phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentemro_conversations TO authenticated;
GRANT ALL ON public.agentemro_conversations TO service_role;
ALTER TABLE public.agentemro_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage conversations in their accounts"
  ON public.agentemro_conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.agentemro_accounts a WHERE a.id = account_id AND a.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agentemro_accounts a WHERE a.id = account_id AND a.owner_user_id = auth.uid()));

-- Mensagens
CREATE TABLE public.agentemro_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.agentemro_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  meta_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agentemro_msg_conv ON public.agentemro_messages(conversation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentemro_messages TO authenticated;
GRANT ALL ON public.agentemro_messages TO service_role;
ALTER TABLE public.agentemro_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access messages of their conversations"
  ON public.agentemro_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agentemro_conversations c
    JOIN public.agentemro_accounts a ON a.id = c.account_id
    WHERE c.id = conversation_id AND a.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agentemro_conversations c
    JOIN public.agentemro_accounts a ON a.id = c.account_id
    WHERE c.id = conversation_id AND a.owner_user_id = auth.uid()
  ));

-- Triggers updated_at
CREATE TRIGGER trg_agentemro_accounts_updated
  BEFORE UPDATE ON public.agentemro_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agentemro_agents_updated
  BEFORE UPDATE ON public.agentemro_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agentemro_conv_updated
  BEFORE UPDATE ON public.agentemro_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

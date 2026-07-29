CREATE TABLE public.mro_tool_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  password_hash TEXT,
  plan_accounts INTEGER NOT NULL DEFAULT 4,
  expiration_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trials_used INTEGER NOT NULL DEFAULT 0,
  trials_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  last_access TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.mro_tool_users TO service_role;
ALTER TABLE public.mro_tool_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mro_tool_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.mro_tool_users(id) ON DELETE CASCADE,
  instagram_username TEXT NOT NULL,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.mro_tool_accounts TO service_role;
ALTER TABLE public.mro_tool_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mro_tool_accounts_user_id ON public.mro_tool_accounts(user_id);
CREATE INDEX idx_mro_tool_users_email ON public.mro_tool_users(lower(email));

CREATE TRIGGER update_mro_tool_users_updated_at
BEFORE UPDATE ON public.mro_tool_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
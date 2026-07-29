CREATE TABLE IF NOT EXISTS public.hub_blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  username text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_blocked_email ON public.hub_blocked_users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_blocked_username ON public.hub_blocked_users (lower(username)) WHERE username IS NOT NULL;
GRANT ALL ON public.hub_blocked_users TO service_role;
ALTER TABLE public.hub_blocked_users ENABLE ROW LEVEL SECURITY;
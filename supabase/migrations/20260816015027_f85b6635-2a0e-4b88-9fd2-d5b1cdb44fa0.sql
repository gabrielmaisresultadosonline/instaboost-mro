ALTER TABLE public.mro_orders ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.mro_tool_users
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_email_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_mro_orders_source ON public.mro_orders(source);
CREATE INDEX IF NOT EXISTS idx_mro_tool_users_source ON public.mro_tool_users(source);
CREATE INDEX IF NOT EXISTS idx_mro_tool_users_expires_at ON public.mro_tool_users(expires_at);
GRANT ALL ON public.mro_tool_users TO service_role;
GRANT ALL ON public.mro_orders TO service_role;
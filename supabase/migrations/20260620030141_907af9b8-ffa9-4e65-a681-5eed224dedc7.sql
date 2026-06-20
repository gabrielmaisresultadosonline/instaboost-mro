
CREATE TABLE public.lovable_extension_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  license_key TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'teste' CHECK (plan_type IN ('teste','30d','90d','vitalicio')),
  credits INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  current_session_id TEXT,
  last_validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.lovable_extension_users TO service_role;

ALTER TABLE public.lovable_extension_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - no public access"
  ON public.lovable_extension_users
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_lovable_ext_users_license_key ON public.lovable_extension_users(license_key);
CREATE INDEX idx_lovable_ext_users_email ON public.lovable_extension_users(email);

CREATE TRIGGER update_lovable_extension_users_updated_at
  BEFORE UPDATE ON public.lovable_extension_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

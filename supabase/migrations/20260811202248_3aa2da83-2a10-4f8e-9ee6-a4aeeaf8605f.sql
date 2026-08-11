CREATE TYPE public.lovablack_plan_type AS ENUM ('trial', 'monthly', 'lifetime');

CREATE TABLE public.lovablack_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    whatsapp TEXT,
    plan_type public.lovablack_plan_type NOT NULL DEFAULT 'trial',
    trial_expires_at TIMESTAMPTZ DEFAULT (now() + interval '20 minutes'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    blocked BOOLEAN DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovablack_users TO authenticated;
GRANT ALL ON public.lovablack_users TO service_role;

ALTER TABLE public.lovablack_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lovablack users"
ON public.lovablack_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_lovablack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

CREATE TRIGGER update_lovablack_users_updated_at
    BEFORE UPDATE ON public.lovablack_users
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_lovablack_updated_at();
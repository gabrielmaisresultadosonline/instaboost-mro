ALTER TABLE public.lovablack_users 
ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS custom_message TEXT;

COMMENT ON COLUMN public.lovablack_users.last_access IS 'Timestamp of the last login/access';
COMMENT ON COLUMN public.lovablack_users.custom_message IS 'Optional broadcast message shown to this user in the extension';
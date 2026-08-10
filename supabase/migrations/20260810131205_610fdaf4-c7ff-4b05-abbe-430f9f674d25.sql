ALTER TABLE public.zapmro_users 
ADD COLUMN IF NOT EXISTS whatsapp_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS registered_numbers TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.zapmro_users.whatsapp_limit IS 'Limit of WhatsApp numbers allowed. -1 for unlimited.';
COMMENT ON COLUMN public.zapmro_users.registered_numbers IS 'List of registered phone numbers for this user.';

-- Grant permissions (standard practice for Lovable Cloud)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zapmro_users TO authenticated;
GRANT ALL ON public.zapmro_users TO service_role;
GRANT SELECT ON public.zapmro_users TO anon;

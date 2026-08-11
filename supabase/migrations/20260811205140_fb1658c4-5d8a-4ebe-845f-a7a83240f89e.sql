-- Ensure lovablack_settings table exists
CREATE TABLE IF NOT EXISTS public.lovablack_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions for settings
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovablack_settings TO authenticated;
GRANT ALL ON public.lovablack_settings TO service_role;

-- Enable RLS for settings
ALTER TABLE public.lovablack_settings ENABLE ROW LEVEL SECURITY;

-- Policy for settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lovablack_settings' 
        AND policyname = 'Admins can manage all lovablack settings'
    ) THEN
        CREATE POLICY "Admins can manage all lovablack settings"
        ON public.lovablack_settings
        FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Add last_access and custom_message to lovablack_users if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lovablack_users' AND column_name='last_access') THEN
        ALTER TABLE public.lovablack_users ADD COLUMN last_access TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lovablack_users' AND column_name='custom_message') THEN
        ALTER TABLE public.lovablack_users ADD COLUMN custom_message TEXT;
    END IF;
END $$;


ALTER TABLE public.lovablack_users ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE TABLE IF NOT EXISTS public.lovablack_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovablack_settings TO authenticated;
GRANT ALL ON public.lovablack_settings TO service_role;

INSERT INTO public.lovablack_settings (key, value)
VALUES ('multi_login_block', 'false')
ON CONFLICT (key) DO NOTHING;

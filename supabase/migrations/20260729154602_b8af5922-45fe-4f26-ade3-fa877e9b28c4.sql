ALTER TABLE public.zapmro_users ADD COLUMN IF NOT EXISTS password_plain TEXT;
ALTER TABLE public.mro_tool_users ADD COLUMN IF NOT EXISTS password_plain TEXT;
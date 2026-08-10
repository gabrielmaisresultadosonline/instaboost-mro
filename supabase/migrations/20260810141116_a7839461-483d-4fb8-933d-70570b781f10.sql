UPDATE public.zapmro_users 
SET whatsapp_limit = -1 
WHERE days_remaining >= 3650 OR (expires_at IS NULL AND days_remaining > 3650);
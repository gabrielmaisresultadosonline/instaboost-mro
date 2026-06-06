ALTER TABLE public.vender_usuarios 
  ADD COLUMN IF NOT EXISTS email_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_enviado_at timestamptz;
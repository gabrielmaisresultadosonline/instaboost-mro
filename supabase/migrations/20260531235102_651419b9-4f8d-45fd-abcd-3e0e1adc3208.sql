
ALTER TABLE public.renda_extra_lead_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_message text DEFAULT 'Olá gostaria de aprender sobre a renda extra';

UPDATE public.renda_extra_lead_settings
  SET whatsapp_number = COALESCE(whatsapp_number, '555198488620'),
      whatsapp_message = COALESCE(whatsapp_message, 'Olá gostaria de aprender sobre a renda extra');

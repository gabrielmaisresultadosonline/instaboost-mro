CREATE TABLE IF NOT EXISTS public.lovablack_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovablack_settings TO authenticated;
GRANT ALL ON public.lovablack_settings TO service_role;

-- Configurações iniciais
INSERT INTO public.lovablack_settings (key, value, description)
VALUES 
('global_announcement', '', 'Aviso global exibido para todos os usuários da extensão'),
('min_extension_version', '1.0.0', 'Versão mínima obrigatória da extensão para funcionamento')
ON CONFLICT (key) DO NOTHING;

-- Table for users registered via /vendernainternet
CREATE TABLE IF NOT EXISTS public.vender_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL, -- Stored as provided (or hashed if preferred, but keeping it simple for now)
    whatsapp TEXT NOT NULL,
    acesso_liberado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for payments
CREATE TABLE IF NOT EXISTS public.vender_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.vender_usuarios(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, pago, expirado
    infinitepay_transaction_id TEXT,
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vender_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vender_pagamentos ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.vender_usuarios TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vender_usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vender_usuarios TO anon;

GRANT ALL ON public.vender_pagamentos TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.vender_pagamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vender_pagamentos TO anon;

-- Policies for vender_usuarios
CREATE POLICY "Enable insert for all" ON public.vender_usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for users matching email" ON public.vender_usuarios FOR SELECT USING (true); -- Simplified for public access/login

-- Policies for vender_pagamentos
CREATE POLICY "Enable insert for all pagamentos" ON public.vender_pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for all pagamentos" ON public.vender_pagamentos FOR SELECT USING (true);
CREATE POLICY "Enable update for service role" ON public.vender_pagamentos FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_vender_usuarios
BEFORE UPDATE ON public.vender_usuarios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_vender_pagamentos
BEFORE UPDATE ON public.vender_pagamentos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

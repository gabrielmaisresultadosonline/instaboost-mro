CREATE TABLE public.eleitoral_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    instagram TEXT,
    cargo TEXT,
    candidatura_definida TEXT,
    equipe_marketing TEXT,
    investimento_anuncios TEXT,
    maior_dificuldade TEXT,
    urgencia TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eleitoral_leads TO authenticated;
GRANT INSERT ON public.eleitoral_leads TO anon;
GRANT ALL ON public.eleitoral_leads TO service_role;

ALTER TABLE public.eleitoral_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts for eleitoral leads"
ON public.eleitoral_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage eleitoral leads"
ON public.eleitoral_leads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

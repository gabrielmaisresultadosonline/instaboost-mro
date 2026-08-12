-- Create renddx_leads table
CREATE TABLE IF NOT EXISTS public.renddx_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT ON public.renddx_leads TO anon;
GRANT SELECT, INSERT ON public.renddx_leads TO authenticated;
GRANT ALL ON public.renddx_leads TO service_role;

-- Enable RLS
ALTER TABLE public.renddx_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (since it's a lead form)
CREATE POLICY "Anyone can insert leads" ON public.renddx_leads FOR INSERT WITH CHECK (true);

-- Policy: Only authenticated (admins) can select
CREATE POLICY "Authenticated can select leads" ON public.renddx_leads FOR SELECT TO authenticated USING (true);

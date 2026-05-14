-- Create partners table
CREATE TABLE public.partners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    pix_key TEXT,
    whatsapp TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    commission_rate NUMERIC NOT NULL DEFAULT 0.7, -- Partner gets 70%, platform takes 30%
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_visits table
CREATE TABLE public.partner_visits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    visitor_ip TEXT,
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add partner_id to mro_orders for direct attribution
ALTER TABLE public.mro_orders 
ADD COLUMN partner_id UUID REFERENCES public.partners(id);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_visits ENABLE ROW LEVEL SECURITY;

-- Policies for partners
CREATE POLICY "Partners can view their own profile" 
ON public.partners 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Partners can update their own profile settings" 
ON public.partners 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for partner visits (insert by anyone, select by partner/admin)
CREATE POLICY "Anyone can record a visit" 
ON public.partner_visits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Partners can view their own visits" 
ON public.partner_visits 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.partners 
        WHERE id = partner_visits.partner_id AND user_id = auth.uid()
    )
);

-- Indexing for performance
CREATE INDEX idx_partners_slug ON public.partners(slug);
CREATE INDEX idx_partner_visits_partner_id ON public.partner_visits(partner_id);
CREATE INDEX idx_mro_orders_partner_id ON public.mro_orders(partner_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for project requests
CREATE TABLE public.creatordev_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    project_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending'
);

-- Table for settings (like admin notification email)
CREATE TABLE public.creatordev_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Initial settings
INSERT INTO public.creatordev_settings (key, value) VALUES ('admin_notification_email', 'seuemail@exemplo.com');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creatordev_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creatordev_requests TO anon;
GRANT ALL ON public.creatordev_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creatordev_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creatordev_settings TO anon;
GRANT ALL ON public.creatordev_settings TO service_role;

-- Enable RLS
ALTER TABLE public.creatordev_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatordev_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert requests" ON public.creatordev_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view requests" ON public.creatordev_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can update requests" ON public.creatordev_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete requests" ON public.creatordev_requests FOR DELETE USING (true);

CREATE POLICY "Anyone can view settings" ON public.creatordev_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.creatordev_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert settings" ON public.creatordev_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete settings" ON public.creatordev_settings FOR DELETE USING (true);

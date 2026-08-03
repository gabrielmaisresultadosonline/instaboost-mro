-- 1. Create a table for Facebook/Instagram App Configurations (Facebook/Meta App credentials)
CREATE TABLE public.mktcc_fb_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    app_secret TEXT NOT NULL,
    client_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mktcc_fb_configs TO authenticated;
GRANT ALL ON public.mktcc_fb_configs TO service_role;

ALTER TABLE public.mktcc_fb_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage FB configs"
ON public.mktcc_fb_configs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create a table for Project Social Connections (Tokens for each company)
CREATE TABLE public.mktcc_project_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.mktcc_projects(id) ON DELETE CASCADE NOT NULL,
    fb_page_id TEXT,
    fb_page_access_token TEXT,
    ig_business_id TEXT,
    user_access_token TEXT,
    connected_as_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mktcc_project_connections TO authenticated;
GRANT ALL ON public.mktcc_project_connections TO service_role;

ALTER TABLE public.mktcc_project_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage project connections"
ON public.mktcc_project_connections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add posting/scheduling columns to posts and cycles
ALTER TABLE public.mktcc_posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS publish_status TEXT CHECK (publish_status IN ('idle', 'scheduled', 'publishing', 'published', 'failed')) DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS publish_error TEXT;

ALTER TABLE public.mktcc_cycles
ADD COLUMN IF NOT EXISTS auto_publish_on_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_interval_days INTEGER DEFAULT 1;

-- 4. Audit Log for Automated Actions
CREATE TABLE public.mktcc_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.mktcc_projects(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.mktcc_posts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.mktcc_automation_logs TO authenticated;
GRANT ALL ON public.mktcc_automation_logs TO service_role;

ALTER TABLE public.mktcc_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view automation logs"
ON public.mktcc_automation_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

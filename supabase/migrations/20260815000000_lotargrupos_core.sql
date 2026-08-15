-- 1. Create enum for access status
DO $$ BEGIN
    CREATE TYPE public.access_status AS ENUM ('active', 'blocked', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create lotargrupos_users table (mirrors the requirement, links to auth.users if needed)
CREATE TABLE IF NOT EXISTS public.lotargrupos_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status public.access_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    hwid TEXT -- for multi-login protection logic if needed
);

-- 3. Create lotargrupos_lessons table
CREATE TABLE IF NOT EXISTS public.lotargrupos_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    video_url TEXT,
    description TEXT,
    buttons JSONB DEFAULT '[]'::jsonb, -- Store list of {label, url}
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.lotargrupos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotargrupos_lessons ENABLE ROW LEVEL SECURITY;

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotargrupos_users TO authenticated;
GRANT ALL ON public.lotargrupos_users TO service_role;

GRANT SELECT ON public.lotargrupos_lessons TO authenticated;
GRANT SELECT ON public.lotargrupos_lessons TO anon; -- Allow viewing if logic allows (or restrict to auth)
GRANT ALL ON public.lotargrupos_lessons TO service_role;

-- 6. Policies
-- Users can read their own access data
CREATE POLICY "Users can view own access" ON public.lotargrupos_users
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Lessons can be read by authenticated users with active access (simplified logic for now)
CREATE POLICY "Authenticated users can view lessons" ON public.lotargrupos_lessons
    FOR SELECT TO authenticated
    USING (status = 'active');

-- Admin check using has_role (assuming 'admin' role exists based on custom instructions)
CREATE POLICY "Admins can manage users" ON public.lotargrupos_users
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lessons" ON public.lotargrupos_lessons
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 7. Seed initial lessons if empty
INSERT INTO public.lotargrupos_lessons (order_index, title, description)
SELECT 1, '01 - A propaganda!', 'Descrição da aula 01'
WHERE NOT EXISTS (SELECT 1 FROM public.lotargrupos_lessons WHERE title = '01 - A propaganda!');

INSERT INTO public.lotargrupos_lessons (order_index, title, description)
SELECT 2, '02 - Criando pixel no Meta Ads', 'Descrição da aula 02'
WHERE NOT EXISTS (SELECT 1 FROM public.lotargrupos_lessons WHERE title = '02 - Criando pixel no Meta Ads');

INSERT INTO public.lotargrupos_lessons (order_index, title, description)
SELECT 3, '03 - Criando página de captura', 'Descrição da aula 03'
WHERE NOT EXISTS (SELECT 1 FROM public.lotargrupos_lessons WHERE title = '03 - Criando página de captura');

INSERT INTO public.lotargrupos_lessons (order_index, title, description)
SELECT 4, '04 - Criando campanha de leads', 'Descrição da aula 04'
WHERE NOT EXISTS (SELECT 1 FROM public.lotargrupos_lessons WHERE title = '04 - Criando campanha de leads');

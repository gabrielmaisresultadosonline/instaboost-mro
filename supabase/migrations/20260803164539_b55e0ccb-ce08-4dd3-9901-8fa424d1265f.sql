
CREATE TABLE IF NOT EXISTS public.mro_tool_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.mro_tool_users(id) ON DELETE CASCADE NOT NULL,
    action_type text NOT NULL CHECK (action_type IN ('account_added', 'account_removed', 'limit_reached', 'extra_consumed', 'trial_used')),
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.mro_tool_logs TO authenticated;
GRANT ALL ON public.mro_tool_logs TO service_role;

ALTER TABLE public.mro_tool_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mro_tool_logs' AND policyname = 'Admins can view all logs'
    ) THEN
        CREATE POLICY "Admins can view all logs" 
        ON public.mro_tool_logs FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mro_tool_logs_user_id ON public.mro_tool_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mro_tool_logs_created_at ON public.mro_tool_logs(created_at);

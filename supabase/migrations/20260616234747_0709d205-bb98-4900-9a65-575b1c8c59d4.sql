
CREATE TABLE IF NOT EXISTS public.api_tokens (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_tokens TO anon, authenticated;
GRANT ALL ON public.api_tokens TO service_role;

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read api_tokens"
  ON public.api_tokens FOR SELECT
  USING (true);

CREATE TRIGGER update_api_tokens_updated_at
  BEFORE UPDATE ON public.api_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

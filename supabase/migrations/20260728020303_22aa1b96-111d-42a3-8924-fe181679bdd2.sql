CREATE TABLE public.zapmro_upgrade_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 97,
  status TEXT NOT NULL DEFAULT 'pending',
  nsu_order TEXT NOT NULL,
  infinitepay_link TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX zapmro_upgrade_fees_username_idx ON public.zapmro_upgrade_fees (username);
CREATE UNIQUE INDEX zapmro_upgrade_fees_nsu_idx ON public.zapmro_upgrade_fees (nsu_order);

GRANT ALL ON public.zapmro_upgrade_fees TO service_role;

ALTER TABLE public.zapmro_upgrade_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on zapmro_upgrade_fees"
ON public.zapmro_upgrade_fees FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_zapmro_upgrade_fees_updated_at
BEFORE UPDATE ON public.zapmro_upgrade_fees
FOR EACH ROW EXECUTE FUNCTION public.update_zapmro_users_updated_at();
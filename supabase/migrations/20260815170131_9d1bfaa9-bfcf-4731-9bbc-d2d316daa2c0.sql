ALTER TABLE public.hub_products ALTER COLUMN is_redirect_only SET DEFAULT false;
UPDATE public.hub_products SET is_redirect_only = false WHERE is_redirect_only IS NULL;
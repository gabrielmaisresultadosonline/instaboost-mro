ALTER TABLE public.renda_extra_v2_settings 
ADD COLUMN launch_date_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.renda_extra_v2_settings.launch_date_enabled IS 'Indicates if the launch date feature is active.';
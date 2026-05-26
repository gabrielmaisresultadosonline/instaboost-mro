CREATE POLICY "Anyone can update empresas_settings" ON public.empresas_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read empresas_leads" ON public.empresas_leads FOR SELECT USING (true);
GRANT SELECT ON public.empresas_leads TO anon;
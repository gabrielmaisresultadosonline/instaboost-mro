CREATE POLICY "Anon read empresas_email_logs" ON public.empresas_email_logs FOR SELECT TO anon USING (true);
GRANT SELECT ON public.empresas_email_logs TO anon;
CREATE OR REPLACE FUNCTION public.sync_zapmro_days()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    -- 1. Se expires_at estiver definido, recalcula days_remaining baseado na diferença para hoje
    -- Não mexemos no is_active aqui, a API computeAccess já cuida de bloquear se expirar
    UPDATE public.zapmro_users
    SET days_remaining = GREATEST(0, (expires_at::DATE - today))
    WHERE expires_at IS NOT NULL 
      AND (days_remaining < 3650); -- Não afeta vitalícios

    -- 2. Se expires_at for nulo mas temos days_remaining, e o usuário acessou hoje ou recentemente,
    -- mas queremos que decremente por dia passado desde a criação ou último sync.
    -- Para simplificar e ser justo: se dias > 0 e não vitalício, reduzimos 1 dia se a data atual mudou
    -- (Este cron deve rodar 1x por dia)
    UPDATE public.zapmro_users
    SET days_remaining = days_remaining - 1
    WHERE expires_at IS NULL 
      AND days_remaining > 0 
      AND days_remaining < 3650;
END;
$$;

-- Grant execution to service_role for edge functions
GRANT EXECUTE ON FUNCTION public.sync_zapmro_days() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_zapmro_days() TO authenticated;

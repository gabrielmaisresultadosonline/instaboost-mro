CREATE OR REPLACE FUNCTION public.sync_zapmro_days()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    -- 1) Backfill: usuários sem data de expiração definida ganham uma data fixa
    --    calculada a partir dos dias restantes atuais. A partir daí a contagem
    --    passa a ser baseada em data (idempotente), nunca em decremento.
    UPDATE public.zapmro_users
    SET expires_at = (today + days_remaining)::timestamptz
    WHERE expires_at IS NULL
      AND days_remaining IS NOT NULL
      AND days_remaining > 0
      AND days_remaining < 3650;

    -- 2) Recalcula os dias restantes a partir da data de expiração.
    --    Idempotente: pode rodar N vezes no mesmo dia sem alterar o resultado.
    UPDATE public.zapmro_users
    SET days_remaining = GREATEST(0, (expires_at::DATE - today))
    WHERE expires_at IS NOT NULL
      AND COALESCE(days_remaining, 0) < 3650
      AND COALESCE(days_remaining, -1) <> GREATEST(0, (expires_at::DATE - today));
END;
$function$;
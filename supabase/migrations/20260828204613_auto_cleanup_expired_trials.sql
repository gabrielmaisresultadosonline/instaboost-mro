-- Trigger automático para limpar contas de teste expiradas.
-- Substitui o DELETE que rodava a cada login e causava timeout de 150s
-- quando a tabela mro_tool_accounts tinha muitas linhas.

CREATE OR REPLACE FUNCTION cleanup_expired_trial_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM mro_tool_accounts
  WHERE is_trial = true
    AND trial_expires_at IS NOT NULL
    AND trial_expires_at < now();
END;
$$;

-- Limpa ao inserir nova conta de teste (baixo volume = rápido)
CREATE OR REPLACE TRIGGER trg_cleanup_expired_trials_on_insert
AFTER INSERT ON mro_tool_accounts
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_trial_accounts();

-- Limpa ao consultar usuários (suficiente para manter a tabela leve)
-- Roda no login normal via API — agora sem o DELETE demorado.
-- A limpeza em background evita acúmulo excessivo entre logins.
-- NOTA: não criar trigger ON SELECT para não gerar overhead em cada SELECT.

-- Job manual (pode ser agendado no pg_cron ou chamar manualmente):
-- SELECT cleanup_expired_trial_accounts();

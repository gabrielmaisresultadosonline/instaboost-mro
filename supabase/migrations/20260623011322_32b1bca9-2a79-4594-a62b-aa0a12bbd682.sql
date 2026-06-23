
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('renda-extrass-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'renda-extrass-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/renda-extrass-offer',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := jsonb_build_object('action','process_reminders')
  );
  $$
);

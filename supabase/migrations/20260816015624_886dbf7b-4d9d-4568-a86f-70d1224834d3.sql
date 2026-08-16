select cron.schedule(
  'renddx-expiration-check',
  '10 12 * * *',
  $$
  select net.http_post(
    url := 'https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/renddx-admin',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"cron_process"}'::jsonb
  );
  $$
);
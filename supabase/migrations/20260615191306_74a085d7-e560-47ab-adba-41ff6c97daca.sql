
ALTER TABLE public.estrutura4_discount_leads
  ADD COLUMN IF NOT EXISTS auto_remarketing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remarketing_stage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_est4_leads_next_send ON public.estrutura4_discount_leads(next_send_at) WHERE auto_remarketing_enabled = true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('estrutura4-remarketing-queue');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'estrutura4-remarketing-queue',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/estrutura4-discount',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{"action":"process_remarketing_queue","cron_secret":"est4-cron-2026-secure"}'::jsonb
  );
  $$
);

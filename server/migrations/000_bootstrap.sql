-- ============================================================
-- Bootstrap do PostgreSQL próprio.
-- Idempotente: pode rodar em toda execução do deploy.
-- Cria extensões, roles, storage local, auth local e realtime.
-- ============================================================

-- ---------- Extensões ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid, hmac, digest
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- uuid_generate_v4 (código legado)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- busca por similaridade
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- busca sem acento
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "citext";

-- pg_cron substitui os agendamentos do serviço anterior.
-- Requer shared_preload_libraries = 'pg_cron' no postgresql.conf.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível (%). Agendamentos ficarão no cron do sistema.', SQLERRM;
END $$;

-- ---------- Roles (mesmos nomes usados nas policies existentes) ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- BYPASSRLS reproduz o comportamento do service_role atual.
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- O usuário da aplicação precisa poder assumir as três roles.
DO $$
DECLARE
  app_user text := current_user;
BEGIN
  EXECUTE format('GRANT anon, authenticated, service_role TO %I', app_user);
END $$;

-- ---------- Compatibilidade: auth.uid() e auth.jwt() ----------
-- As 219 tabelas têm policies que chamam auth.uid(). Recriamos o schema `auth`
-- lendo as mesmas variáveis de sessão (request.jwt.claims) que o backend define.
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      auth.jwt() ->> 'sub',
      NULLIF(current_setting('request.jwt.claim.sub', true), '')
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', current_setting('role', true), 'anon');
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'email';
$$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email()
  TO anon, authenticated, service_role;

-- ---------- Usuários locais (substitui auth.users) ----------
CREATE TABLE IF NOT EXISTS public.auth_users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              citext UNIQUE NOT NULL,
  password_hash      text NOT NULL,
  email_confirmed_at timestamptz,
  user_metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  banned_until       timestamptz,
  last_sign_in_at    timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

-- Hash de senha nunca deve ser legível pela API pública.
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.auth_users TO authenticated;
GRANT ALL ON public.auth_users TO service_role;

DROP POLICY IF EXISTS "auth_users_self_read" ON public.auth_users;
CREATE POLICY "auth_users_self_read"
  ON public.auth_users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Compatibilidade com foreign keys que referenciam auth.users.
CREATE OR REPLACE VIEW auth.users AS
  SELECT id, email::text AS email, email_confirmed_at, created_at, updated_at,
         user_metadata AS raw_user_meta_data, last_sign_in_at, banned_until
    FROM public.auth_users;
GRANT SELECT ON auth.users TO authenticated, service_role;

-- ---------- Storage local ----------
CREATE TABLE IF NOT EXISTS public.storage_buckets (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  public     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storage_objects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id    text NOT NULL REFERENCES public.storage_buckets(id) ON DELETE CASCADE,
  name         text NOT NULL,
  size         bigint NOT NULL DEFAULT 0,
  content_type text,
  owner        uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, name)
);

CREATE INDEX IF NOT EXISTS storage_objects_bucket_name_idx
  ON public.storage_objects (bucket_id, name);

ALTER TABLE public.storage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.storage_buckets TO anon, authenticated;
GRANT SELECT ON public.storage_objects TO anon, authenticated;
GRANT ALL ON public.storage_buckets TO service_role;
GRANT ALL ON public.storage_objects TO service_role;

DROP POLICY IF EXISTS "buckets_public_read" ON public.storage_buckets;
CREATE POLICY "buckets_public_read"
  ON public.storage_buckets FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "objects_public_read" ON public.storage_objects;
CREATE POLICY "objects_public_read"
  ON public.storage_objects FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.storage_buckets b
      WHERE b.id = storage_objects.bucket_id AND b.public
    )
    OR owner = auth.uid()
  );

-- Buckets atuais, preservando a visibilidade de hoje.
INSERT INTO public.storage_buckets (id, name, public) VALUES
  ('assets',                   'assets',                   true),
  ('crm-media',                'crm-media',                true),
  ('inteligencia-fotos',       'inteligencia-fotos',       true),
  ('metodo-seguidor-backup',   'metodo-seguidor-backup',   false),
  ('metodo-seguidor-content',  'metodo-seguidor-content',  true),
  ('postscomia-videos',        'postscomia-videos',        false),
  ('profile-cache',            'profile-cache',            true),
  ('trial-screenshots',        'trial-screenshots',        true),
  ('user-data',                'user-data',                true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ---------- Realtime via LISTEN/NOTIFY ----------
CREATE OR REPLACE FUNCTION public.realtime_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'type',  TG_OP,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  -- NOTIFY tem limite de 8000 bytes; payloads grandes viram um aviso enxuto
  -- e o cliente refaz a leitura pela API.
  IF length(payload::text) > 7000 THEN
    payload := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'type',  TG_OP,
      'record', jsonb_build_object('id', COALESCE(to_jsonb(NEW) -> 'id', to_jsonb(OLD) -> 'id')),
      'truncated', true
    );
  END IF;

  PERFORM pg_notify('realtime_changes', payload::text);
  RETURN NULL;
END;
$$;

-- Habilita realtime numa tabela específica (chamado pelo deploy).
CREATE OR REPLACE FUNCTION public.enable_realtime(target_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = target_table AND c.relkind = 'r'
  ) THEN
    RAISE NOTICE 'Tabela % não existe; realtime ignorado.', target_table;
    RETURN;
  END IF;

  EXECUTE format('DROP TRIGGER IF EXISTS realtime_notify_trg ON public.%I', target_table);
  EXECUTE format(
    'CREATE TRIGGER realtime_notify_trg AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.realtime_notify()',
    target_table
  );
END;
$$;

-- Tabelas que o frontend acompanha em tempo real hoje.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ig_conversations', 'ig_messages', 'crm_contacts',
    'crm_flow_executions', 'user_sessions'
  ]
  LOOP
    PERFORM public.enable_realtime(t);
  END LOOP;
END $$;

-- ---------- Registro de execuções da migração ----------
CREATE TABLE IF NOT EXISTS public.migration_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step        text NOT NULL,
  status      text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT ALL ON public.migration_runs TO service_role;
ALTER TABLE public.migration_runs ENABLE ROW LEVEL SECURITY;

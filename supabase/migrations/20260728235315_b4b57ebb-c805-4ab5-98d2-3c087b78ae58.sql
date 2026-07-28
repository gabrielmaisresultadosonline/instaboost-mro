ALTER TABLE public.zapmro_users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.zapmro_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  image_url text,
  video_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT false,
  display_duration integer NOT NULL DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zapmro_announcements TO anon, authenticated;
GRANT ALL ON public.zapmro_announcements TO service_role;

ALTER TABLE public.zapmro_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read zapmro announcements" ON public.zapmro_announcements;
CREATE POLICY "Public can read zapmro announcements"
  ON public.zapmro_announcements FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_zapmro_announcements_updated_at ON public.zapmro_announcements;
CREATE TRIGGER update_zapmro_announcements_updated_at
  BEFORE UPDATE ON public.zapmro_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_zapmro_users_updated_at();
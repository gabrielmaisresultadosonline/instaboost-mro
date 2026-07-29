CREATE TABLE IF NOT EXISTS public.hub_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  thumb_url text,
  app_route text,
  sales_page_url text,
  price numeric NOT NULL DEFAULT 0,
  access_source text NOT NULL DEFAULT 'manual',
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hub_product_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.hub_products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  video_url text,
  download_url text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_tutorials_product ON public.hub_product_tutorials(product_id);

CREATE TABLE IF NOT EXISTS public.hub_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.hub_products(id) ON DELETE SET NULL,
  product_slug text,
  name text,
  email text NOT NULL,
  whatsapp text,
  amount numeric NOT NULL DEFAULT 0,
  nsu_order text UNIQUE,
  infinitepay_link text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_orders_email ON public.hub_orders(email);

CREATE TABLE IF NOT EXISTS public.hub_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.hub_products(id) ON DELETE CASCADE,
  email text,
  username text,
  source text NOT NULL DEFAULT 'manual',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_access_email ON public.hub_access(email);
CREATE INDEX IF NOT EXISTS idx_hub_access_username ON public.hub_access(username);

GRANT ALL ON public.hub_products TO service_role;
GRANT ALL ON public.hub_product_tutorials TO service_role;
GRANT ALL ON public.hub_orders TO service_role;
GRANT ALL ON public.hub_access TO service_role;

ALTER TABLE public.hub_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_product_tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_access ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER hub_products_updated_at BEFORE UPDATE ON public.hub_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER hub_tutorials_updated_at BEFORE UPDATE ON public.hub_product_tutorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER hub_orders_updated_at BEFORE UPDATE ON public.hub_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.hub_products (slug, title, description, app_route, sales_page_url, price, access_source, order_index)
VALUES
  ('mro-ferramenta', 'MRO Ferramenta', 'A ferramenta completa para Instagram: estratégias com IA, criativos, relatórios e crescimento de perfil.', '/instagram', '/ferramentamropromo', 297, 'mro_tool', 1),
  ('zapmro', 'ZAPMRO — Extensão WhatsApp', 'Extensão para WhatsApp com disparos, automações e organização dos seus atendimentos.', '/zapmro', '/zapmro', 97, 'zapmro', 2),
  ('postscomia', 'Posts com IA', 'Área de membros com o método completo para criar posts que vendem usando Inteligência Artificial.', '/postscomia/membros', '/postscomia', 47, 'postscomia', 3)
ON CONFLICT (slug) DO NOTHING;
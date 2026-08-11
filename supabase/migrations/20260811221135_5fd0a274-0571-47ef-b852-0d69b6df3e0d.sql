-- Reforçar permissões na tabela lovablack_users
GRANT ALL ON public.lovablack_users TO authenticated;
GRANT ALL ON public.lovablack_users TO service_role;

-- Recriar política administrativa de forma mais abrangente para evitar erros de RLS
DROP POLICY IF EXISTS "Admins can manage all lovablack users" ON public.lovablack_users;

CREATE POLICY "Admins can manage all lovablack users"
ON public.lovablack_users
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Garantir que a função has_role também funcione corretamente se for usada internamente
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
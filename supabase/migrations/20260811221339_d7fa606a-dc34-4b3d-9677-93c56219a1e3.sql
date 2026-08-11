-- Garantir que a tabela tenha RLS habilitado
ALTER TABLE public.lovablack_users ENABLE ROW LEVEL SECURITY;

-- Reforçar permissões para os roles necessários
GRANT ALL ON public.lovablack_users TO authenticated;
GRANT ALL ON public.lovablack_users TO service_role;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admins can manage all lovablack users" ON public.lovablack_users;
DROP POLICY IF EXISTS "Admins can select all rows" ON public.lovablack_users;

-- Criar política simplificada e robusta para administradores
-- Usando a função has_role que já deve existir no sistema
CREATE POLICY "Admins have full access to lovablack_users"
ON public.lovablack_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Caso a função has_role não esteja disponível ou falhe, garantimos o GRANT na tabela de roles
GRANT SELECT ON public.user_roles TO authenticated;

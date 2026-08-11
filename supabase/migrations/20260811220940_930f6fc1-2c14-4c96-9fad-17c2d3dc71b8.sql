-- Fix RLS policy for lovablack_users to ensure admins can create users
DROP POLICY IF EXISTS "Admins can manage all lovablack users" ON public.lovablack_users;

CREATE POLICY "Admins can manage all lovablack users"
ON public.lovablack_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure grants are correct
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lovablack_users TO authenticated;
GRANT ALL ON public.lovablack_users TO service_role;

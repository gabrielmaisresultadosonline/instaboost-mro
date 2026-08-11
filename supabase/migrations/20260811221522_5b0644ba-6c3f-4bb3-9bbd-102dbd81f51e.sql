-- Ensure lovablack_users table exists and has RLS enabled
ALTER TABLE public.lovablack_users ENABLE ROW LEVEL SECURITY;

-- Explicitly grant permissions to authenticated and service_role
GRANT ALL ON public.lovablack_users TO authenticated;
GRANT ALL ON public.lovablack_users TO service_role;

-- Remove any existing policies that might be restrictive
DROP POLICY IF EXISTS "Admins can manage all lovablack users" ON public.lovablack_users;
DROP POLICY IF EXISTS "Admins can select all rows" ON public.lovablack_users;
DROP POLICY IF EXISTS "Admins have full access to lovablack_users" ON public.lovablack_users;

-- Create a robust admin policy using the has_role function
-- This ensures that only users with 'admin' role in user_roles table can manage this data
CREATE POLICY "Admins full access to lovablack_users"
ON public.lovablack_users
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure service_role also has full bypass (standard for Edge Functions/Internal)
CREATE POLICY "Service role full access to lovablack_users"
ON public.lovablack_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Double check user_roles access for the has_role function
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO service_role;

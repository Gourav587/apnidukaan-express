
-- Drop restrictive INSERT policies and recreate as permissive
DROP POLICY IF EXISTS "Anonymous can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- Permissive INSERT for anonymous users
CREATE POLICY "Anonymous can create orders"
ON public.orders FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Permissive INSERT for authenticated users
CREATE POLICY "Authenticated users can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

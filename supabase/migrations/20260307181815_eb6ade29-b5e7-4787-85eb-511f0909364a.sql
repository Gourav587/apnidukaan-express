
-- Fix permissive INSERT policy on orders - allow anyone to insert but restrict to anon + authenticated
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anonymous can create orders" ON public.orders FOR INSERT TO anon WITH CHECK (user_id IS NULL);

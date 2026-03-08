
-- Ledger table for wholesale credit/debit tracking
CREATE TABLE public.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'payment')),
  amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

-- Wholesale users can view own ledger
CREATE POLICY "Users can view own ledger"
ON public.ledger FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all ledger entries
CREATE POLICY "Admins can manage ledger"
ON public.ledger FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all profiles (needed for wholesale customer management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- Khata customers (walk-in credit customers)
CREATE TABLE public.khata_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.khata_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage khata customers" ON public.khata_customers
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Khata transactions (credit given, payments received)
CREATE TABLE public.khata_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.khata_customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('credit', 'payment')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage khata transactions" ON public.khata_transactions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update khata_customers.updated_at
CREATE TRIGGER update_khata_customers_updated_at
  BEFORE UPDATE ON public.khata_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Suppliers / Parties table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gstin TEXT,
  email TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  party_type TEXT NOT NULL DEFAULT 'supplier',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Expense categories
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
  ('Rent', 'Shop/office rent'),
  ('Salary', 'Employee salaries'),
  ('Electricity', 'Electricity bills'),
  ('Transport', 'Delivery and logistics'),
  ('Packaging', 'Packaging material'),
  ('Maintenance', 'Equipment & shop maintenance'),
  ('Marketing', 'Advertising & promotions'),
  ('Misc', 'Miscellaneous expenses');

-- Purchase Bills
CREATE TABLE public.purchase_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  bill_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_total NUMERIC NOT NULL DEFAULT 0,
  sgst_total NUMERIC NOT NULL DEFAULT 0,
  igst_total NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purchase bills" ON public.purchase_bills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchase Bill Items
CREATE TABLE public.purchase_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_bill_id UUID NOT NULL REFERENCES public.purchase_bills(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  hsn_code TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC NOT NULL DEFAULT 0,
  cgst NUMERIC NOT NULL DEFAULT 0,
  sgst NUMERIC NOT NULL DEFAULT 0,
  igst NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purchase bill items" ON public.purchase_bill_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Payment Entries (unified for both sales & purchase)
CREATE TABLE public.payment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type TEXT NOT NULL DEFAULT 'customer',
  party_id UUID,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  purchase_bill_id UUID REFERENCES public.purchase_bills(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment entries" ON public.payment_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generate purchase bill numbers
CREATE OR REPLACE FUNCTION public.generate_purchase_bill_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
  fiscal_year TEXT;
BEGIN
  fiscal_year := CASE
    WHEN EXTRACT(MONTH FROM now()) >= 4 THEN
      TO_CHAR(now(), 'YY') || '-' || TO_CHAR(now() + interval '1 year', 'YY')
    ELSE
      TO_CHAR(now() - interval '1 year', 'YY') || '-' || TO_CHAR(now(), 'YY')
  END;
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM '\d+$') AS integer)), 0) + 1
  INTO next_num FROM public.purchase_bills
  WHERE bill_number LIKE 'PB/' || fiscal_year || '/%';
  RETURN 'PB/' || fiscal_year || '/' || LPAD(next_num::text, 4, '0');
END;
$$;

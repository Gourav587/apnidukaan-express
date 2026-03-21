
-- GST slab enum
CREATE TYPE public.gst_slab AS ENUM ('0', '5', '12', '18', '28');

-- Product type enum
CREATE TYPE public.product_type AS ENUM ('loose', 'packed');

-- Add GST/HSN and product type to products table
ALTER TABLE public.products
  ADD COLUMN gst_rate public.gst_slab NOT NULL DEFAULT '5',
  ADD COLUMN hsn_code text DEFAULT NULL,
  ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'packed';

-- Product variants table (size/weight variants)
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,  -- e.g., "250g", "500g", "1kg"
  price numeric NOT NULL DEFAULT 0,
  wholesale_price numeric DEFAULT NULL,
  mrp numeric DEFAULT NULL,
  stock integer NOT NULL DEFAULT 0,
  sku text DEFAULT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_products_hsn ON public.products(hsn_code);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS: Public read
CREATE POLICY "Product variants are publicly readable"
  ON public.product_variants FOR SELECT
  TO public
  USING (true);

-- RLS: Admin manage
CREATE POLICY "Admins can manage product variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.orders(id),
  customer_name text,
  customer_phone text,
  customer_address text,
  customer_gstin text,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  taxable_amount numeric NOT NULL DEFAULT 0,
  cgst_total numeric NOT NULL DEFAULT 0,
  sgst_total numeric NOT NULL DEFAULT 0,
  igst_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice items
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  description text NOT NULL,
  hsn_code text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  taxable_amount numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice items"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())));

-- Credit notes
CREATE TABLE public.credit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_note_number text NOT NULL UNIQUE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credit notes"
  ON public.credit_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Payment records for tracking partial payments
CREATE TABLE public.invoice_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice payments"
  ON public.invoice_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sequence generator for invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  fiscal_year text;
BEGIN
  fiscal_year := CASE
    WHEN EXTRACT(MONTH FROM now()) >= 4 THEN
      TO_CHAR(now(), 'YY') || '-' || TO_CHAR(now() + interval '1 year', 'YY')
    ELSE
      TO_CHAR(now() - interval '1 year', 'YY') || '-' || TO_CHAR(now(), 'YY')
  END;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '\d+$') AS integer)
  ), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number LIKE 'INV/' || fiscal_year || '/%';

  RETURN 'INV/' || fiscal_year || '/' || LPAD(next_num::text, 4, '0');
END;
$$;

-- Credit note number generator
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  fiscal_year text;
BEGIN
  fiscal_year := CASE
    WHEN EXTRACT(MONTH FROM now()) >= 4 THEN
      TO_CHAR(now(), 'YY') || '-' || TO_CHAR(now() + interval '1 year', 'YY')
    ELSE
      TO_CHAR(now() - interval '1 year', 'YY') || '-' || TO_CHAR(now(), 'YY')
  END;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(credit_note_number FROM '\d+$') AS integer)
  ), 0) + 1
  INTO next_num
  FROM public.credit_notes
  WHERE credit_note_number LIKE 'CN/' || fiscal_year || '/%';

  RETURN 'CN/' || fiscal_year || '/' || LPAD(next_num::text, 4, '0');
END;
$$;

-- HSN code lookup table for common grocery items
CREATE TABLE public.hsn_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hsn_code text NOT NULL UNIQUE,
  description text NOT NULL,
  gst_rate public.gst_slab NOT NULL DEFAULT '5',
  category text
);

ALTER TABLE public.hsn_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HSN codes are publicly readable"
  ON public.hsn_codes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage HSN codes"
  ON public.hsn_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed common grocery HSN codes
INSERT INTO public.hsn_codes (hsn_code, description, gst_rate, category) VALUES
  ('0401', 'Milk and cream', '0', 'Dairy'),
  ('0402', 'Concentrated milk, cream, yogurt', '5', 'Dairy'),
  ('0405', 'Butter, ghee', '12', 'Dairy'),
  ('0406', 'Cheese and curd', '12', 'Dairy'),
  ('0713', 'Dried pulses (dal, chana)', '0', 'Pulses'),
  ('0901', 'Coffee', '5', 'Beverages'),
  ('0902', 'Tea', '5', 'Beverages'),
  ('1001', 'Wheat', '0', 'Grains'),
  ('1005', 'Maize (corn)', '0', 'Grains'),
  ('1006', 'Rice', '0', 'Grains'),
  ('1101', 'Wheat flour (atta)', '0', 'Grains'),
  ('1507', 'Soyabean oil', '5', 'Oils'),
  ('1508', 'Groundnut oil', '5', 'Oils'),
  ('1512', 'Sunflower oil, safflower oil', '5', 'Oils'),
  ('1515', 'Mustard oil', '5', 'Oils'),
  ('1517', 'Vanaspati ghee', '12', 'Oils'),
  ('1701', 'Cane/beet sugar', '5', 'Sugar'),
  ('1702', 'Jaggery (gur)', '0', 'Sugar'),
  ('1704', 'Sugar confectionery', '18', 'Sweets'),
  ('1901', 'Malt extract, food preparations', '18', 'Processed Foods'),
  ('1905', 'Bread, biscuits, cakes', '5', 'Bakery'),
  ('2001', 'Pickles', '12', 'Preserved Foods'),
  ('2002', 'Tomato paste', '12', 'Preserved Foods'),
  ('2103', 'Sauces, ketchup', '12', 'Condiments'),
  ('2104', 'Soups and broths', '18', 'Processed Foods'),
  ('2106', 'Papad, namkeen', '5', 'Snacks'),
  ('2201', 'Mineral water', '18', 'Beverages'),
  ('2202', 'Aerated drinks, juices', '28', 'Beverages'),
  ('2501', 'Salt', '0', 'Spices'),
  ('0904', 'Pepper', '5', 'Spices'),
  ('0905', 'Vanilla', '5', 'Spices'),
  ('0906', 'Cinnamon', '5', 'Spices'),
  ('0908', 'Cardamom', '5', 'Spices'),
  ('0910', 'Turmeric, cumin, other spices', '5', 'Spices'),
  ('3401', 'Soap', '18', 'Personal Care'),
  ('3402', 'Detergent', '18', 'Household'),
  ('3306', 'Toothpaste', '18', 'Personal Care'),
  ('3305', 'Hair oil, shampoo', '18', 'Personal Care'),
  ('4818', 'Toilet paper, tissues', '18', 'Household'),
  ('4402', 'Charcoal', '5', 'Household');

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Add bulk discount configuration to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bulk_discount_tiers jsonb DEFAULT '[]'::jsonb;

-- Add max order quantity limits to store_settings as global config
INSERT INTO public.store_settings (key, value) VALUES 
  ('max_retail_order_qty', '50'),
  ('max_wholesale_order_qty', '500')
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN public.products.bulk_discount_tiers IS 'Array of {qty: number, discount_percent: number}';

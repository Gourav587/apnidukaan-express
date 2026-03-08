
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS shop_name text,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS wholesale_status text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.profiles.wholesale_status IS 'none, pending, approved, rejected';

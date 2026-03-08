
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Settings are publicly readable" ON public.store_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert default settings
INSERT INTO public.store_settings (key, value) VALUES
  ('store_name', 'ApniDukaan'),
  ('delivery_charges', '30'),
  ('free_delivery_threshold', '500'),
  ('tax_percentage', '0'),
  ('store_phone', ''),
  ('store_address', 'Dinanagar, Punjab');


CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item JSONB;
  product_id UUID;
  qty INT;
BEGIN
  -- Only run on new orders (INSERT)
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    product_id := (item->>'id')::UUID;
    qty := (item->>'quantity')::INT;
    
    UPDATE public.products
    SET stock = GREATEST(stock - qty, 0)
    WHERE id = product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrease_stock_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock_on_order();

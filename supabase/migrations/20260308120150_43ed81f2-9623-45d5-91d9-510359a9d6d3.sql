
CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
  _user_id UUID,
  _order_id UUID,
  _type TEXT,
  _amount NUMERIC,
  _description TEXT
)
RETURNS public.ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev_balance NUMERIC;
  new_balance NUMERIC;
  result public.ledger;
BEGIN
  -- Lock the user's latest ledger row to prevent concurrent reads
  SELECT balance INTO prev_balance
  FROM public.ledger
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  prev_balance := COALESCE(prev_balance, 0);

  IF _type = 'debit' THEN
    new_balance := prev_balance + _amount;
  ELSE
    new_balance := prev_balance - _amount;
  END IF;

  INSERT INTO public.ledger (user_id, order_id, type, amount, balance, description)
  VALUES (_user_id, _order_id, _type, _amount, new_balance, _description)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

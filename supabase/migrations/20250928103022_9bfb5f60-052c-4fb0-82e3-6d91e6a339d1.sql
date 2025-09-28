-- Fix the remaining function security warning
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  counter INTEGER;
  today_date TEXT;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO counter
  FROM public.transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  RETURN 'TXN-' || today_date || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$;
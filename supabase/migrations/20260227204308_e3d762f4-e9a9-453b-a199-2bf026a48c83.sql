
-- Make opened_by nullable so salon owners can also open the cash register
ALTER TABLE public.cash_registers ALTER COLUMN opened_by DROP NOT NULL;


CREATE TABLE public.class_fees (
  class TEXT NOT NULL PRIMARY KEY,
  amount NUMERIC NOT NULL
);

COMMENT ON TABLE public.class_fees IS 'Stores fee amounts for each student class.';

ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users"
ON public.class_fees
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all access for service_role"
ON public.class_fees
FOR ALL
TO service_role
USING (true);

INSERT INTO public.class_fees (class, amount) VALUES
('8th', 500),
('9th', 600),
('10th', 700),
('11th', 800);


ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_phone text;

-- Copy existing parent_phone data to father_phone
UPDATE public.students SET father_phone = parent_phone WHERE parent_phone IS NOT NULL AND father_phone IS NULL;

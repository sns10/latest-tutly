-- Drop the incorrect unique constraint that prevents same division names across tuitions
ALTER TABLE public.divisions DROP CONSTRAINT IF EXISTS divisions_class_name_key;

-- Add correct unique constraint that includes tuition_id
ALTER TABLE public.divisions ADD CONSTRAINT divisions_tuition_class_name_key UNIQUE (tuition_id, class, name);
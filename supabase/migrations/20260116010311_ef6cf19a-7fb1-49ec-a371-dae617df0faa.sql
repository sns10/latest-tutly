-- Add new fields to students table for comprehensive student data
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add slug column to tuitions for friendly URLs
ALTER TABLE public.tuitions 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Generate slugs for existing tuitions based on name
UPDATE public.tuitions 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTR(id::text, 1, 8)
WHERE slug IS NULL;

-- Create an index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_tuitions_slug ON public.tuitions(slug);

-- Add RLS policy for public student registration via edge function
-- The edge function will use service role key, so we need a policy that allows inserts
-- when the tuition is active (this will be validated in the edge function)
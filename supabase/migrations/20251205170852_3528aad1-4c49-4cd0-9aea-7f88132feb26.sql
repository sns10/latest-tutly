-- Drop the incorrect unique constraint on class alone
ALTER TABLE class_fees DROP CONSTRAINT IF EXISTS class_fees_class_key;

-- Add correct unique constraint on (class, tuition_id) for multi-tenancy
ALTER TABLE class_fees ADD CONSTRAINT class_fees_class_tuition_unique UNIQUE (class, tuition_id);
-- Add fields to support regular and special timetables
ALTER TABLE timetable 
ADD COLUMN type text NOT NULL DEFAULT 'regular',
ADD COLUMN specific_date date NULL,
ADD COLUMN start_date date NULL,
ADD COLUMN end_date date NULL;

-- Add check constraint for timetable types
ALTER TABLE timetable
ADD CONSTRAINT timetable_type_check CHECK (type IN ('regular', 'special'));

-- Add index for efficient date queries
CREATE INDEX idx_timetable_dates ON timetable(specific_date, start_date, end_date);

-- Comments for clarity
COMMENT ON COLUMN timetable.type IS 'Type of timetable: regular (weekly recurring) or special (specific dates)';
COMMENT ON COLUMN timetable.specific_date IS 'For one-time special classes on a specific date';
COMMENT ON COLUMN timetable.start_date IS 'For special timetables that apply to a date range';
COMMENT ON COLUMN timetable.end_date IS 'For special timetables that apply to a date range';
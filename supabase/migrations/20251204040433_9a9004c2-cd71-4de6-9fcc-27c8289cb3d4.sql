-- Create rooms table for Room Management
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER,
  description TEXT,
  tuition_id UUID NOT NULL REFERENCES public.tuitions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS policies for rooms
CREATE POLICY "Super admins can manage all rooms"
ON public.rooms
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tuition admins can manage their tuition's rooms"
ON public.rooms
FOR ALL
USING (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'tuition_admin'::app_role) AND tuition_id = get_user_tuition_id(auth.uid()));

-- Add room_id foreign key to timetable table (optional, we keep room_number for backward compatibility)
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Add event_type column to timetable for special class categorization
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'class';

-- Add notes column to timetable
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster room availability queries
CREATE INDEX IF NOT EXISTS idx_timetable_room_id ON public.timetable(room_id);
CREATE INDEX IF NOT EXISTS idx_timetable_specific_date ON public.timetable(specific_date);
CREATE INDEX IF NOT EXISTS idx_rooms_tuition_id ON public.rooms(tuition_id);
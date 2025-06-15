
-- Create attendance table
CREATE TABLE public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create fee management table
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for attendance
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on student_attendance" 
  ON public.student_attendance 
  FOR ALL 
  USING (true);

-- Add RLS policies for fees
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on student_fees" 
  ON public.student_fees 
  FOR ALL 
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_student_attendance_date ON public.student_attendance(date);
CREATE INDEX idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX idx_student_fees_student_id ON public.student_fees(student_id);
CREATE INDEX idx_student_fees_status ON public.student_fees(status);
CREATE INDEX idx_student_fees_due_date ON public.student_fees(due_date);

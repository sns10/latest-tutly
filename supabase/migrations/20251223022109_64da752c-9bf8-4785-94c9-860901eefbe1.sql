-- Add new columns to student_fees for advanced fee tracking
ALTER TABLE public.student_fees 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS partial_amount_paid numeric DEFAULT 0;

-- Add new columns to class_fees for late fee configuration
ALTER TABLE public.class_fees 
ADD COLUMN IF NOT EXISTS late_fee_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_day integer DEFAULT 5;

-- Create fee_payments table to track payment history for partial/multiple payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_id uuid NOT NULL REFERENCES public.student_fees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cash',
  payment_reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on fee_payments
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for fee_payments
CREATE POLICY "Multi-tenant fee_payments access"
ON public.fee_payments
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (fee_id IN (
    SELECT sf.id FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    WHERE s.tuition_id = get_user_tuition_id(auth.uid())
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (fee_id IN (
    SELECT sf.id FROM student_fees sf
    JOIN students s ON sf.student_id = s.id
    WHERE s.tuition_id = get_user_tuition_id(auth.uid())
  ))
);

-- Students can view their own payment history
CREATE POLICY "Students can view their own fee payments"
ON public.fee_payments
FOR SELECT
USING (
  fee_id IN (
    SELECT sf.id FROM student_fees sf
    WHERE sf.student_id IN (
      SELECT s.id FROM students s WHERE s.user_id = auth.uid()
    )
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_payments_fee_id ON public.fee_payments(fee_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON public.student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON public.student_fees(due_date);
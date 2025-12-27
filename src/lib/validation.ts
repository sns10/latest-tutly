import { z } from 'zod';

// =====================
// Common Validation Helpers
// =====================

/**
 * Sanitize string input - trim and remove dangerous characters
 */
export const sanitizeString = (value: string): string => {
  return value
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, ''); // Remove any remaining angle brackets
};

/**
 * Sanitize numeric input - ensure valid number within range
 */
export const sanitizeNumber = (value: string, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const num = parseFloat(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
};

/**
 * Validate and sanitize currency amount
 */
export const sanitizeCurrency = (value: string): number => {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₹$,\s]/g, '');
  return sanitizeNumber(cleaned, 0, 10000000); // Max 1 crore
};

// =====================
// Zod Schemas for Fee Forms
// =====================

export const paymentAmountSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be a positive number')
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 10000000;
    }, 'Amount cannot exceed ₹1,00,00,000'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card'], {
    required_error: 'Payment method is required',
  }),
  reference: z
    .string()
    .max(100, 'Reference cannot exceed 100 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
});

export const customFeeSchema = z.object({
  studentId: z.string().uuid('Invalid student ID').optional(),
  selectedClass: z.string().optional(),
  feeType: z.string().min(1, 'Fee type is required'),
  customFeeType: z
    .string()
    .max(100, 'Custom fee type cannot exceed 100 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be a positive number'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
});

export const feeStructureSchema = z.object({
  amount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(10000000, 'Amount cannot exceed ₹1,00,00,000'),
  lateFeePercentage: z
    .number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100')
    .optional(),
  lateFeeAmount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(10000, 'Late fee cannot exceed ₹10,000')
    .optional(),
  gracePeriod: z
    .number()
    .min(0, 'Grace period cannot be negative')
    .max(365, 'Grace period cannot exceed 365 days')
    .optional(),
});

// =====================
// Zod Schemas for Timetable Forms
// =====================

export const scheduleClassSchema = z.object({
  class: z.enum(['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'], {
    required_error: 'Class is required',
  }),
  subjectId: z.string().uuid('Invalid subject').min(1, 'Subject is required'),
  facultyId: z.string().uuid('Invalid faculty').optional(),
  divisionId: z.string().uuid('Invalid division').optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  roomId: z.string().uuid('Invalid room').optional(),
  eventType: z
    .string()
    .max(50, 'Event type cannot exceed 50 characters')
    .transform((val) => sanitizeString(val)),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const timetableEntrySchema = z.object({
  class: z.enum(['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']),
  subjectId: z.string().uuid('Invalid subject').min(1, 'Subject is required'),
  facultyId: z.string().uuid('Invalid faculty').min(1, 'Faculty is required'),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  roomNumber: z
    .string()
    .max(50, 'Room number cannot exceed 50 characters')
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

// =====================
// WhatsApp Message Validation
// =====================

export const whatsappMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(4096, 'Message cannot exceed 4096 characters') // WhatsApp limit
    .transform((val) => sanitizeString(val)),
});

// =====================
// Validation Result Types
// =====================

export type PaymentFormData = z.infer<typeof paymentAmountSchema>;
export type CustomFeeFormData = z.infer<typeof customFeeSchema>;
export type ScheduleClassFormData = z.infer<typeof scheduleClassSchema>;
export type TimetableEntryFormData = z.infer<typeof timetableEntrySchema>;

// =====================
// Validation Helper Functions
// =====================

export const validatePaymentAmount = (amount: string, maxAmount: number): { valid: boolean; error?: string } => {
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid number' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  if (num > maxAmount) {
    return { valid: false, error: `Amount cannot exceed ₹${maxAmount.toLocaleString('en-IN')}` };
  }
  
  return { valid: true };
};

export const validateTimeRange = (startTime: string, endTime: string): { valid: boolean; error?: string } => {
  if (!startTime || !endTime) {
    return { valid: false, error: 'Both start and end times are required' };
  }
  
  if (startTime >= endTime) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  return { valid: true };
};

export const validateFutureDate = (dateStr: string): { valid: boolean; error?: string } => {
  if (!dateStr) {
    return { valid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { valid: false, error: 'Date cannot be in the past' };
  }
  
  return { valid: true };
};

// =====================
// Input Sanitization for Display
// =====================

export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
};



# Three Feature Updates

## Feature 1: Father & Mother Phone Numbers

Currently the `students` table has a single `parent_phone` field. We need to split this into two separate fields.

### Database Migration
- Add two new columns to `students` table: `father_phone` (text, nullable) and `mother_phone` (text, nullable)
- Keep existing `parent_phone` column for backward compatibility (copy its value to `father_phone` via migration)

### Files Modified
- **`src/types.ts`** — Add `fatherPhone?: string` and `motherPhone?: string` to `Student` interface
- **`src/components/AddStudentDialog.tsx`** — Replace single "Parent Ph" field with "Father Phone *" and "Mother Phone (optional)"
- **`src/components/StudentDetailsDialog.tsx`** — Show both phone fields in Info tab and edit form
- **`src/pages/StudentRegistration.tsx`** — Update registration form with both fields, update Zod schema (father phone required, mother phone optional)
- **`src/hooks/queries/useStudentsQuery.ts`** — Map `father_phone` and `mother_phone` from DB
- **`src/hooks/useSupabaseData.ts`** — Handle updates for both fields
- **`src/components/BulkImportStudentsDialog.tsx`** — Update Excel template columns
- **`supabase/functions/register-student/index.ts`** — Accept `fatherPhone` and `motherPhone`
- **`src/components/fees/WhatsAppReminderDialog.tsx`** — Use `fatherPhone` for WhatsApp link, fallback to `motherPhone`

---

## Feature 2: Export Student Data (Class-wise or All)

Add an export button on the Students page to download student details as Excel.

### Files Modified
- **`src/pages/Students.tsx`** — Add "Export Students" button with dropdown (current class filter / all students)
- Uses existing `xlsx` library (already installed for bulk import) to generate a spreadsheet with columns: Name, Class, Division, Roll No, DOB, Gender, Email, Phone, Father Phone, Mother Phone, Parent Name, Address

---

## Feature 3: Malayalam Fee Reminder Template

Add a language selector to the WhatsApp reminder dialog so tuition admins can send messages in Malayalam.

### Files Modified
- **`src/components/fees/WhatsAppReminderDialog.tsx`** — Add a language toggle (English / Malayalam) at the top. When Malayalam is selected, generate the fee reminder message in Malayalam script. The template will use proper Malayalam text for greeting, fee details, and closing. Admin can still edit the message before sending.

### Malayalam Template Example
```
പ്രിയ രക്ഷിതാവ്,

{student_name} (ക്ലാസ്: {class}) യുടെ ഫീസ് അടവ് സംബന്ധിച്ച ഒരു ഓർമ്മപ്പെടുത്തലാണ് ഇത്.

*കുടിശ്ശിക ഫീസ്:*
{fee_details}

*ആകെ കുടിശ്ശിക: ₹{amount}*

ലേറ്റ് ഫീസ് ഒഴിവാക്കാൻ ദയവായി എത്രയും വേഗം ഫീസ് അടയ്ക്കുക.

നന്ദി.
ട്യൂഷൻ അഡ്മിനിസ്ട്രേഷൻ
```

---

## Summary of All Changes

| Area | Files Changed |
|------|--------------|
| DB Migration | 1 new migration (add `father_phone`, `mother_phone`) |
| Types | `src/types.ts` |
| Add Student | `AddStudentDialog.tsx` |
| Student Details | `StudentDetailsDialog.tsx` |
| Registration | `StudentRegistration.tsx`, `register-student/index.ts` |
| Data Hooks | `useStudentsQuery.ts`, `useSupabaseData.ts` |
| Bulk Import | `BulkImportStudentsDialog.tsx` |
| Export | `Students.tsx` (new export button) |
| WhatsApp | `WhatsAppReminderDialog.tsx` (Malayalam template + language toggle) |


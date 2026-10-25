# Batch WhatsApp fee reminders

## What the center admin gets
On the Fees page, next to the existing "Mark selected as paid" action:

1. **Send reminders to selected**: tick students (or use the select-all checkbox after filtering, e.g. Class 10 + Unpaid/Overdue), then tap **Send WhatsApp reminders**.
2. A confirmation dialog shows:
   - how many parents will get a message and the total amount due
   - a list of the students, each with their amount due and a mark if they have no valid parent phone (those are skipped)
   - a **Send** button
3. After sending, a summary shows how many were sent and how many failed, with the reason for each failure (e.g. "No valid parent phone").

The button only shows for centers where you have switched on Automated WhatsApp. For other centers nothing changes, and the "Open WhatsApp" button for one student stays as it is.

## Rules
- One message per student, even if they have several unpaid fees. The message shows the total still owed after part-payments and the earliest due date.
- Paid fees and students who owe nothing are left out automatically.
- Each send is saved in the WhatsApp log, as today.

## Technical details
- `FeesList.tsx`: from `selectedFees`, group by `studentId`, compute the remaining amount from `totalPaidByFeeId` and the earliest `dueDate`, and drop anything at ₹0. Add a bulk-bar button that is visible only when `useWhatsAppAutomation().enabled`.
- New `BulkWhatsAppReminderDialog.tsx`: shows a preview, then calls the existing `send.mutateAsync({ template: 'fee_reminder_v1', messages })`, which already splits sends into batches of 200 and returns per-student results.
- `send-whatsapp` function: no change in logic. It already accepts up to 200 students from one center and sends one by one. Add a small pause between sends (about 100 ms) so Meta doesn't limit large batches.
- Mobile: the dialog is limited to `max-h-[90vh]` and scrolls.

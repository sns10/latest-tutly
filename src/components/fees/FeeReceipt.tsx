import React, { useRef } from 'react';
import { StudentFee } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, MessageCircle } from 'lucide-react';

interface FeePayment {
  id: string;
  feeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
}

interface TuitionInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

interface FeeReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: StudentFee;
  studentName: string;
  studentClass: string;
  payment: FeePayment;
  tuition: TuitionInfo | null;
  receiptNumber?: string;
}

const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    card: 'Card',
  };
  return methods[method] || method;
};

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  let words = '';

  if (Math.floor(num / 10000000) > 0) {
    words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  if (Math.floor(num / 100000) > 0) {
    words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  if (Math.floor(num / 100) > 0) {
    words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }

  if (num > 0) {
    if (num < 20) {
      words += ones[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + ones[num % 10];
      }
    }
  }

  return words.trim();
};

export function FeeReceipt({
  open,
  onOpenChange,
  fee,
  studentName,
  studentClass,
  payment,
  tuition,
  receiptNumber,
}: FeeReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${studentName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: white;
              color: #1a1a1a;
            }
            .receipt {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #1a1a1a;
              padding: 24px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #ccc;
              padding-bottom: 16px;
              margin-bottom: 16px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .header p {
              font-size: 12px;
              color: #666;
            }
            .receipt-title {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              background: #f0f0f0;
              padding: 8px;
              margin-bottom: 16px;
              border: 1px solid #ddd;
            }
            .receipt-meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 16px;
              font-size: 13px;
            }
            .student-info {
              background: #f9f9f9;
              padding: 12px;
              margin-bottom: 16px;
              border-left: 4px solid #1a1a1a;
            }
            .student-info p {
              margin-bottom: 4px;
              font-size: 13px;
            }
            .student-info strong {
              display: inline-block;
              width: 120px;
            }
            .payment-details {
              margin-bottom: 16px;
            }
            .payment-details table {
              width: 100%;
              border-collapse: collapse;
            }
            .payment-details th, .payment-details td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }
            .payment-details th {
              background: #f0f0f0;
              font-weight: 600;
            }
            .amount-row td {
              font-weight: bold;
              font-size: 15px;
            }
            .amount-words {
              background: #f9f9f9;
              padding: 12px;
              margin-bottom: 16px;
              font-style: italic;
              font-size: 12px;
              border: 1px dashed #ccc;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 48px;
              padding-top: 16px;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 1px solid #1a1a1a;
              padding-top: 8px;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 2px dashed #ccc;
              font-size: 11px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .receipt { border-width: 1px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generatedReceiptNumber = receiptNumber || `RCP-${payment.id.substring(0, 8).toUpperCase()}`;

  const handleWhatsAppShare = () => {
    const receiptText = `*FEE RECEIPT*
${tuition?.name || 'Tuition Center'}
━━━━━━━━━━━━━━━

*Receipt No:* ${generatedReceiptNumber}
*Date:* ${new Date(payment.paymentDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}

*Student:* ${studentName}
*Class:* ${studentClass}
*Fee Type:* ${fee.feeType}

*Amount Paid:* ₹${payment.amount.toLocaleString('en-IN')}
*Payment Method:* ${formatPaymentMethod(payment.paymentMethod)}${payment.paymentReference ? `\n*Reference:* ${payment.paymentReference}` : ''}

━━━━━━━━━━━━━━━
Thank you for your payment!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Fee Receipt</DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleWhatsAppShare}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogHeader>

        {/* Receipt Content */}
        <div ref={receiptRef} className="receipt bg-white p-6 border-2 border-foreground">
          {/* Header */}
          <div className="header text-center border-b-2 border-dashed border-muted pb-4 mb-4">
            {tuition?.logo_url && (
              <img 
                src={tuition.logo_url} 
                alt="Logo" 
                className="h-16 w-auto mx-auto mb-2"
              />
            )}
            <h1 className="text-2xl font-bold">{tuition?.name || 'Tuition Center'}</h1>
            {tuition?.address && <p className="text-xs text-muted-foreground">{tuition.address}</p>}
            {(tuition?.phone || tuition?.email) && (
              <p className="text-xs text-muted-foreground">
                {tuition?.phone && `Ph: ${tuition.phone}`}
                {tuition?.phone && tuition?.email && ' | '}
                {tuition?.email && `Email: ${tuition.email}`}
              </p>
            )}
          </div>

          {/* Receipt Title */}
          <div className="receipt-title text-center text-lg font-bold bg-muted py-2 mb-4 border">
            FEE RECEIPT
          </div>

          {/* Receipt Meta */}
          <div className="receipt-meta flex justify-between mb-4 text-sm">
            <div>
              <strong>Receipt No:</strong> {generatedReceiptNumber}
            </div>
            <div>
              <strong>Date:</strong> {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Student Info */}
          <div className="student-info bg-muted/30 p-3 mb-4 border-l-4 border-foreground">
            <p className="text-sm mb-1">
              <strong className="inline-block w-28">Student Name:</strong> {studentName}
            </p>
            <p className="text-sm mb-1">
              <strong className="inline-block w-28">Class:</strong> {studentClass}
            </p>
            <p className="text-sm">
              <strong className="inline-block w-28">Fee Type:</strong> {fee.feeType}
            </p>
          </div>

          {/* Payment Details Table */}
          <div className="payment-details mb-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left">Description</th>
                  <th className="border p-2 bg-muted text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">
                    {fee.feeType} - {new Date(fee.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="border p-2 text-right">₹{fee.amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="amount-row font-bold text-base">
                  <td className="border p-2 bg-muted/50">Amount Paid</td>
                  <td className="border p-2 text-right bg-muted/50">₹{payment.amount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="amount-words bg-muted/30 p-3 mb-4 italic text-sm border border-dashed">
            <strong>Amount in Words:</strong> Rupees {numberToWords(Math.round(payment.amount))} Only
          </div>

          {/* Payment Method */}
          <div className="text-sm mb-4">
            <p><strong>Payment Method:</strong> {formatPaymentMethod(payment.paymentMethod)}</p>
            {payment.paymentReference && (
              <p><strong>Reference:</strong> {payment.paymentReference}</p>
            )}
            {payment.notes && (
              <p><strong>Notes:</strong> {payment.notes}</p>
            )}
          </div>

          {/* Signatures */}
          <div className="signatures flex justify-between mt-12 pt-4">
            <div className="signature-box text-center w-2/5">
              <div className="signature-line border-t border-foreground pt-2 text-xs">
                Received By
              </div>
            </div>
            <div className="signature-box text-center w-2/5">
              <div className="signature-line border-t border-foreground pt-2 text-xs">
                Authorized Signature
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center mt-6 pt-4 border-t-2 border-dashed text-xs text-muted-foreground">
            <p>This is a computer-generated receipt.</p>
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

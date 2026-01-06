import { useState, useEffect } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, List, Settings, FileText, PlusCircle, Receipt, Activity } from 'lucide-react';
import { 
  FeeDashboard, 
  FeesList, 
  FeeStructureManager, 
  FeeReports,
  AddCustomFeeDialog,
  CustomFeesManager,
  PaymentActivityFeed
} from '@/components/fees';
import { FeesPageSkeleton } from '@/components/skeletons/PageSkeletons';
import { toast } from 'sonner';

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

export default function FeesPage() {
  const { 
    students, 
    fees, 
    classFees, 
    divisions,
    loading,
    addFee,
    addFeesBatch,
    updateFeeStatus,
    updateClassFee,
    deleteFee,
    fetchFees
  } = useSupabaseData();

  const [addFeeDialogOpen, setAddFeeDialogOpen] = useState(false);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  // Fetch payments
  useEffect(() => {
    fetchPayments();
  }, [fees]);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return;
    }

    setPayments((data || []).map(p => ({
      id: p.id,
      feeId: p.fee_id,
      amount: Number(p.amount) || 0,
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method || 'cash',
      paymentReference: p.payment_reference || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
    })));
  };

  const handleRecordPayment = async (feeId: string, amount: number, paymentMethod: string, reference?: string, notes?: string) => {
    const { error } = await supabase
      .from('fee_payments')
      .insert({
        fee_id: feeId,
        amount,
        payment_method: paymentMethod,
        payment_reference: reference || null,
        notes: notes || null,
      });

    if (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
      return;
    }

    // Calculate total paid for this fee
    const fee = fees.find(f => f.id === feeId);
    if (fee) {
      const existingPayments = payments.filter(p => p.feeId === feeId);
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + amount;
      
      if (totalPaid >= fee.amount) {
        await updateFeeStatus(feeId, 'paid', new Date().toISOString().split('T')[0]);
      } else {
        await updateFeeStatus(feeId, 'partial');
      }
    }

    await fetchPayments();
    toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} recorded`);
  };

  const handleDeleteFee = async (feeId: string) => {
    if (deleteFee) {
      await deleteFee(feeId);
    }
  };

  // Show skeleton during loading
  if (loading) {
    return <FeesPageSkeleton />;
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-primary">Fee Management</h1>
          <p className="text-sm text-muted-foreground">Manage student fees, payments, and reports</p>
        </div>
        <Button onClick={() => setAddFeeDialogOpen(true)} size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Custom Fee
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide h-auto p-1 bg-white border border-slate-200 touch-pan-x">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Dashboard</span>
            <span className="xs:hidden">Dash</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Activity</span>
            <span className="xs:hidden">Act</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Custom</span>
            <span className="xs:hidden">Cust</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Structure</span>
            <span className="xs:hidden">Struct</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 shrink-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Reports</span>
            <span className="xs:hidden">Rpt</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <FeeDashboard 
            students={students}
            fees={fees}
            classFees={classFees}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <PaymentActivityFeed
            feePayments={payments.map(p => ({
              id: p.id,
              fee_id: p.feeId,
              amount: p.amount,
              payment_date: p.paymentDate,
              payment_method: p.paymentMethod,
              payment_reference: p.paymentReference || null,
              notes: p.notes || null,
              created_at: p.createdAt,
            }))}
            fees={fees}
            students={students}
          />
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <FeesList
            students={students}
            fees={fees}
            classFees={classFees}
            payments={payments}
            divisions={divisions}
            onAddFee={addFee}
            onAddFeesBatch={addFeesBatch}
            onUpdateFeeStatus={updateFeeStatus}
            onRecordPayment={handleRecordPayment}
          />
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <CustomFeesManager
            students={students}
            fees={fees}
            payments={payments}
            onUpdateFeeStatus={updateFeeStatus}
            onDeleteFee={handleDeleteFee}
            onAddCustomFee={() => setAddFeeDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="structure" className="mt-4">
          <FeeStructureManager
            classFees={classFees}
            students={students}
            onUpdateClassFee={updateClassFee}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FeeReports
            students={students}
            fees={fees}
            classFees={classFees}
          />
        </TabsContent>
      </Tabs>

      {/* Add Custom Fee Dialog */}
      <AddCustomFeeDialog
        open={addFeeDialogOpen}
        onOpenChange={setAddFeeDialogOpen}
        students={students}
        onAddFee={addFee}
      />
    </div>
  );
}
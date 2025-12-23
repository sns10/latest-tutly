import { useState } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutDashboard, List, Settings, FileText, PlusCircle } from 'lucide-react';
import { 
  FeeDashboard, 
  FeesList, 
  FeeStructureManager, 
  FeeReports,
  AddCustomFeeDialog 
} from '@/components/fees';

export default function FeesPage() {
  const { 
    students, 
    fees, 
    classFees, 
    loading,
    addFee,
    updateFeeStatus,
    updateClassFee
  } = useSupabaseData();

  const [addFeeDialogOpen, setAddFeeDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
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
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <LayoutDashboard className="h-4 w-4 hidden sm:block" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <List className="h-4 w-4 hidden sm:block" />
            Fees
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <Settings className="h-4 w-4 hidden sm:block" />
            Structure
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
            <FileText className="h-4 w-4 hidden sm:block" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <FeeDashboard 
            students={students}
            fees={fees}
            classFees={classFees}
          />
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <FeesList
            students={students}
            fees={fees}
            classFees={classFees}
            onAddFee={addFee}
            onUpdateFeeStatus={updateFeeStatus}
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

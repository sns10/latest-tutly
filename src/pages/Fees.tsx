import { useSupabaseData } from '@/hooks/useSupabaseData';
import { FeeManagement } from '@/components/FeeManagement';
import { ClassFeeManager } from '@/components/ClassFeeManager';
import { Loader2 } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <ClassFeeManager 
        classFees={classFees}
        onUpdateClassFee={updateClassFee}
      />
      <FeeManagement
        students={students}
        fees={fees}
        classFees={classFees}
        onAddFee={addFee}
        onUpdateFeeStatus={updateFeeStatus}
      />
    </div>
  );
}

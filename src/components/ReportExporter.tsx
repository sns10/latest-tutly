import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReportExporterProps {
  type: 'absentees' | 'test-marks' | 'student-report' | 'attendance-calendar';
  label?: string;
  classValue?: string;
  startDate?: string;
  endDate?: string;
  testId?: string;
  studentId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ReportExporter({
  type,
  label,
  classValue,
  startDate,
  endDate,
  testId,
  studentId,
  variant = 'outline',
  size = 'sm',
}: ReportExporterProps) {
  const handleExport = async () => {
    try {
      toast.loading('Generating report...');

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          type,
          classValue,
          startDate,
          endDate,
          testId,
          studentId,
        },
      });

      if (error) throw error;

      // Convert the response to a blob
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.dismiss();
      toast.error('Failed to generate report');
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport}>
      <Download className={size === 'icon' ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
      {size !== 'icon' && (label || 'Export PDF')}
    </Button>
  );
}

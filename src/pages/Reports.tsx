import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthlyAttendanceReport } from '@/components/reports/MonthlyAttendanceReport';
import { ConsolidatedTestReport } from '@/components/reports/ConsolidatedTestReport';
import { StudentReportCard } from '@/components/reports/StudentReportCard';
import { TermExamReport } from '@/components/reports/TermExamReport';
import { CalendarDays, FileText, GraduationCap, BookOpen } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="w-full px-3 py-4 sm:px-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="w-full flex overflow-x-auto justify-start gap-1 bg-muted/50 p-1 h-auto">
          <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
            <CalendarDays className="h-4 w-4" />
            <span>Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
            <FileText className="h-4 w-4" />
            <span>Test Results</span>
          </TabsTrigger>
          <TabsTrigger value="term-exams" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
            <BookOpen className="h-4 w-4" />
            <span>Term Exams</span>
          </TabsTrigger>
          <TabsTrigger value="report-card" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 whitespace-nowrap">
            <GraduationCap className="h-4 w-4" />
            <span>Report Card</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <MonthlyAttendanceReport />
        </TabsContent>

        <TabsContent value="tests" className="mt-4">
          <ConsolidatedTestReport />
        </TabsContent>

        <TabsContent value="term-exams" className="mt-4">
          <TermExamReport />
        </TabsContent>

        <TabsContent value="report-card" className="mt-4">
          <StudentReportCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

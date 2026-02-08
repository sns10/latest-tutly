import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, X, UserMinus, TrendingDown } from 'lucide-react';
import { StudentAlert } from '@/hooks/useStudentAlerts';
import { StudentDetailsDialog } from '@/components/StudentDetailsDialog';
import { Student, WeeklyTest, StudentTestResult, StudentAttendance, StudentFee, TermExam, TermExamSubject, TermExamResult, Subject, Faculty } from '@/types';

interface StudentAlertsCardProps {
  alerts: StudentAlert[];
  totalCount: number;
  onDismiss: (alertId: string) => void;
  students: Student[];
  weeklyTests: WeeklyTest[];
  testResults: StudentTestResult[];
  attendance: StudentAttendance[];
  fees: StudentFee[];
  termExams: TermExam[];
  termExamSubjects: TermExamSubject[];
  termExamResults: TermExamResult[];
  subjects: Subject[];
  faculty: Faculty[];
  onRemoveStudent: (studentId: string) => void;
}

const MAX_VISIBLE = 10;

export function StudentAlertsCard({
  alerts,
  totalCount,
  onDismiss,
  students,
  weeklyTests,
  testResults,
  attendance,
  fees,
  termExams,
  termExamSubjects,
  termExamResults,
  subjects,
  faculty,
  onRemoveStudent,
}: StudentAlertsCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  if (alerts.length === 0) return null;

  const displayAlerts = showAll ? alerts : alerts.slice(0, MAX_VISIBLE);
  const hasMore = alerts.length > MAX_VISIBLE;
  const selectedStudent = selectedStudentId ? students.find(s => s.id === selectedStudentId) : null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border border-amber-200 shadow-sm">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 text-left">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-semibold text-foreground">Student Alerts</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {alerts.length}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4 space-y-1.5">
              {displayAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onDismiss={onDismiss}
                  onClick={() => setSelectedStudentId(alert.studentId)}
                />
              ))}

              {hasMore && !showAll && (
                <button
                  className="w-full text-xs text-primary hover:underline py-1"
                  onClick={() => setShowAll(true)}
                >
                  View all {alerts.length} alerts
                </button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {selectedStudent && (
        <StudentDetailsDialog
          student={selectedStudent}
          tests={weeklyTests}
          testResults={testResults}
          attendance={attendance}
          fees={fees}
          termExams={termExams}
          termExamSubjects={termExamSubjects}
          termExamResults={termExamResults}
          subjects={subjects}
          faculty={faculty}
          open={!!selectedStudentId}
          onOpenChange={(open) => {
            if (!open) setSelectedStudentId(null);
          }}
          onRemoveStudent={onRemoveStudent}
        />
      )}
    </>
  );
}

function AlertRow({
  alert,
  onDismiss,
  onClick,
}: {
  alert: StudentAlert;
  onDismiss: (id: string) => void;
  onClick: () => void;
}) {
  const isCritical = alert.severity === 'critical';

  return (
    <div
      className={`flex items-start gap-2 p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors border ${
        isCritical
          ? 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20'
          : 'bg-amber-50 hover:bg-amber-100 border-amber-200'
      }`}
      onClick={onClick}
    >
      <div className="shrink-0 mt-0.5">
        {alert.type === 'consecutive_absence' ? (
          <UserMinus className={`h-4 w-4 ${isCritical ? 'text-destructive' : 'text-amber-500'}`} />
        ) : (
          <TrendingDown className={`h-4 w-4 ${isCritical ? 'text-destructive' : 'text-amber-500'}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {alert.studentName}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            {alert.studentClass}
          </Badge>
        </div>
        <p className={`text-xs mt-0.5 font-medium ${
          isCritical ? 'text-destructive' : 'text-amber-700'
        }`}>
          {alert.message}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {alert.detail}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-6 w-6 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(alert.id);
        }}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}

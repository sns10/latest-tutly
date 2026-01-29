import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DailySummary } from '@/hooks/useDailySummary';
import { 
  Calendar, 
  Users, 
  IndianRupee, 
  ClipboardCheck,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailySummaryCardProps {
  summary: DailySummary;
  isFeatureEnabled: (feature: string) => boolean;
}

export function DailySummaryCard({ summary, isFeatureEnabled }: DailySummaryCardProps) {
  const navigate = useNavigate();
  const today = new Date();
  
  const showClasses = isFeatureEnabled('timetable');
  const showAttendance = isFeatureEnabled('attendance');
  const showFees = isFeatureEnabled('fees');
  
  // Calculate which sections to show
  const visibleSections = [
    showClasses || showAttendance, // Classes/Attendance combined section
    showFees, // Fees section
    true, // Tests always shown
  ].filter(Boolean).length;
  
  // If no sections to show, don't render the card
  if (visibleSections === 0) return null;

  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Today at a Glance
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(today, 'MMM d, yyyy')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Classes Status Section */}
          {showClasses && (
            <SummarySection
              icon={<ClipboardCheck className="h-4 w-4" />}
              title="Classes"
              onClick={() => navigate('/attendance')}
              variant={summary.attendanceProgress === 100 ? 'success' : summary.attendanceProgress > 0 ? 'warning' : 'neutral'}
            >
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{summary.classesWithAttendance}</span>
                  <span className="text-xs text-muted-foreground">/ {summary.totalClassesToday} marked</span>
                </div>
                <Progress 
                  value={summary.attendanceProgress} 
                  className="h-1.5"
                />
                <span className="text-xs text-muted-foreground">
                  {summary.totalClassesToday === 0 ? 'No classes today' : `${summary.attendanceProgress}% complete`}
                </span>
              </div>
            </SummarySection>
          )}

          {/* Attendance Snapshot Section */}
          {showAttendance && (
            <SummarySection
              icon={<Users className="h-4 w-4" />}
              title="Attendance"
              onClick={() => navigate('/attendance')}
              variant={summary.attendanceRate >= 80 ? 'success' : summary.attendanceRate >= 60 ? 'warning' : 'danger'}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">{summary.presentCount}</span>
                  <span className="text-xs text-muted-foreground">present</span>
                  <span className="text-muted-foreground">|</span>
                  <span className={cn(
                    "text-lg font-bold",
                    summary.absentCount > 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {summary.absentCount}
                  </span>
                  <span className="text-xs text-muted-foreground">absent</span>
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  summary.attendanceRate >= 80 ? "text-green-600" : 
                  summary.attendanceRate >= 60 ? "text-amber-600" : "text-red-500"
                )}>
                  {summary.presentCount + summary.absentCount > 0 ? `${summary.attendanceRate}% attendance rate` : 'No attendance marked'}
                </span>
              </div>
            </SummarySection>
          )}

          {/* Fee Collection Section */}
          {showFees && (
            <SummarySection
              icon={<IndianRupee className="h-4 w-4" />}
              title="Fees"
              onClick={() => navigate('/fees')}
              variant={summary.overdueCount > 0 ? 'danger' : summary.feesDueSoon > 0 ? 'warning' : 'success'}
            >
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <span className="text-lg font-bold text-green-600">
                    {summary.collectedToday.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted-foreground">today</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {summary.feesDueSoon > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      {summary.feesDueSoon} due soon
                    </span>
                  )}
                  {summary.overdueCount > 0 && (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">
                      <AlertCircle className="h-3 w-3" />
                      {summary.overdueCount} overdue
                    </span>
                  )}
                  {summary.feesDueSoon === 0 && summary.overdueCount === 0 && (
                    <span className="text-xs text-green-600 font-medium">All clear!</span>
                  )}
                </div>
              </div>
            </SummarySection>
          )}

          {/* Upcoming Tests Section */}
          <SummarySection
            icon={<Calendar className="h-4 w-4" />}
            title="Tests This Week"
            onClick={() => navigate('/tests')}
            variant="neutral"
          >
            <div className="space-y-1">
              {summary.upcomingTests.length > 0 ? (
                <>
                  <span className="text-lg font-bold">{summary.upcomingTests.length}</span>
                  <span className="text-xs text-muted-foreground ml-1">upcoming</span>
                  <div className="space-y-0.5 mt-1">
                    {summary.upcomingTests.slice(0, 2).map((test, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground truncate">
                        • {test.subject} {test.class && `(${test.class})`} - {format(parseISO(test.date), 'MMM d')}
                      </div>
                    ))}
                    {summary.upcomingTests.length > 2 && (
                      <div className="text-xs text-primary font-medium">
                        +{summary.upcomingTests.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No tests this week</span>
              )}
            </div>
          </SummarySection>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummarySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}

function SummarySection({ icon, title, children, onClick, variant = 'neutral' }: SummarySectionProps) {
  const borderColors = {
    success: 'border-l-green-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    neutral: 'border-l-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-2 sm:p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors",
        "border-l-2",
        borderColors[variant],
        "group"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {children}
    </button>
  );
}

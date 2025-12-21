import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, TrendingUp, Trophy, Target, BookOpen } from 'lucide-react';

interface TestResult {
  id: string;
  marks: number;
  test_id: string;
}

interface Test {
  id: string;
  name: string;
  subject: string;
  max_marks: number;
  test_date: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  subject_id?: string | null;
  subjectId?: string | null;
}

interface Subject {
  id: string;
  name: string;
}

interface StudentStatsProps {
  testResults: TestResult[];
  tests: Test[];
  attendance: AttendanceRecord[];
  subjects: Subject[];
}

export function StudentStats({ testResults, tests, attendance, subjects }: StudentStatsProps) {
  // Calculate academic average
  const academicStats = useMemo(() => {
    const results = testResults.map(result => {
      const test = tests.find(t => t.id === result.test_id);
      return {
        ...result,
        test,
        percentage: test ? (result.marks / test.max_marks) * 100 : 0
      };
    }).filter(r => r.test);

    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length 
      : 0;

    // Calculate subject-wise performance
    const bySubject: Record<string, { total: number; sum: number; tests: { name: string; percentage: number }[] }> = {};
    results.forEach(r => {
      if (!r.test) return;
      const subject = r.test.subject;
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, sum: 0, tests: [] };
      }
      bySubject[subject].total++;
      bySubject[subject].sum += r.percentage;
      bySubject[subject].tests.push({ name: r.test.name, percentage: r.percentage });
    });

    const subjectPerformance = Object.entries(bySubject).map(([subject, data]) => ({
      subject,
      average: data.total > 0 ? data.sum / data.total : 0,
      testCount: data.total,
      trend: data.tests.length >= 2 
        ? data.tests[0].percentage - data.tests[data.tests.length - 1].percentage 
        : 0
    })).sort((a, b) => b.average - a.average);

    // Best and weakest subjects
    const bestSubject = subjectPerformance[0];
    const weakestSubject = subjectPerformance[subjectPerformance.length - 1];

    return { averageScore, subjectPerformance, bestSubject, weakestSubject, totalTests: results.length };
  }, [testResults, tests]);

  // Calculate longest streak
  const streakStats = useMemo(() => {
    const presentDates = new Set<string>();
    attendance.forEach(r => {
      if (r.status === 'present') {
        presentDates.add(r.date);
      }
    });

    const dates = Array.from(presentDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let longestStreak = 1;
    let currentRunningStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const date = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);
      const diff = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        currentRunningStreak++;
        longestStreak = Math.max(longestStreak, currentRunningStreak);
      } else {
        currentRunningStreak = 1;
      }
    }

    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sortedDesc = Array.from(presentDates).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let currentStreak = 0;
    if (sortedDesc.length > 0) {
      const mostRecent = new Date(sortedDesc[0]);
      mostRecent.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        currentStreak = 1;
        for (let i = 1; i < sortedDesc.length; i++) {
          const date = new Date(sortedDesc[i]);
          date.setHours(0, 0, 0, 0);
          
          const prevDate = new Date(sortedDesc[i - 1]);
          prevDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return { currentStreak, longestStreak };
  }, [attendance]);

  // Subject-wise attendance
  const subjectAttendance = useMemo(() => {
    const bySubject: Record<string, { present: number; total: number }> = {};
    
    attendance.forEach(record => {
      const subjectId = record.subject_id || record.subjectId || 'general';
      if (!bySubject[subjectId]) {
        bySubject[subjectId] = { present: 0, total: 0 };
      }
      bySubject[subjectId].total++;
      if (record.status === 'present') {
        bySubject[subjectId].present++;
      }
    });

    return Object.entries(bySubject).map(([subjectId, data]) => {
      const subject = subjects.find(s => s.id === subjectId);
      return {
        subjectId,
        subjectName: subject?.name || 'General',
        ...data,
        rate: data.total > 0 ? (data.present / data.total) * 100 : 0
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [attendance, subjects]);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 90) return { label: 'A+', variant: 'default' as const };
    if (percentage >= 80) return { label: 'A', variant: 'default' as const };
    if (percentage >= 70) return { label: 'B', variant: 'secondary' as const };
    if (percentage >= 60) return { label: 'C', variant: 'secondary' as const };
    return { label: 'D', variant: 'destructive' as const };
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Academic Average */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Academic Average</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGradeColor(academicStats.averageScore)}`}>
              {academicStats.averageScore.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge {...getGradeBadge(academicStats.averageScore)}>
                Grade {getGradeBadge(academicStats.averageScore).label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({academicStats.totalTests} tests)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {streakStats.currentStreak} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep it going!
            </p>
          </CardContent>
        </Card>

        {/* Longest Streak */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {streakStats.longestStreak} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Personal best
            </p>
          </CardContent>
        </Card>

        {/* Best Subject */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {academicStats.bestSubject ? (
              <>
                <div className="text-lg font-bold truncate">
                  {academicStats.bestSubject.subject}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">
                    {academicStats.bestSubject.average.toFixed(1)}%
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tests yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {academicStats.subjectPerformance.length > 0 ? (
            <div className="space-y-4">
              {academicStats.subjectPerformance.map((subject, index) => (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.subject}</span>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Best</Badge>
                      )}
                      {subject.trend > 5 && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          ↑ Improving
                        </Badge>
                      )}
                      {subject.trend < -5 && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                          ↓ Declining
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${getGradeColor(subject.average)}`}>
                        {subject.average.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({subject.testCount} tests)
                      </span>
                    </div>
                  </div>
                  <Progress value={subject.average} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No test results yet</p>
          )}
        </CardContent>
      </Card>

      {/* Subject-wise Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectAttendance.length > 0 ? (
            <div className="space-y-4">
              {subjectAttendance.map((subject) => (
                <div key={subject.subjectId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{subject.subjectName}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={subject.rate >= 75 ? 'default' : subject.rate >= 60 ? 'secondary' : 'destructive'}>
                        {subject.rate.toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {subject.present}/{subject.total}
                      </span>
                    </div>
                  </div>
                  <Progress value={subject.rate} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { useStudentData } from '@/hooks/useStudentData';
import { useTuitionInfo } from '@/hooks/useTuitionInfo';
import { useStudentLeaderboard } from '@/hooks/useStudentLeaderboard';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StudentPortalLeaderboard } from '@/components/StudentPortalLeaderboard';
import { StudentPortalAuth } from '@/components/StudentPortalAuth';
import { StudentPortalSelector } from '@/components/StudentPortalSelector';
import { Loader2, TrendingUp, CalendarDays, Award, DollarSign, Bell, Building2, LogOut, Trophy, ArrowLeft } from 'lucide-react';

export default function Student() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const { 
    student, 
    allStudents, 
    tuition: sharedTuition,
    isSharedAccess,
    attendance, 
    testResults, 
    tests, 
    fees, 
    subjects, 
    announcements, 
    loading 
  } = useStudentData(selectedStudentId);
  
  const { tuition } = useTuitionInfo();
  const { leaderboardStudents, loading: leaderboardLoading } = useStudentLeaderboard(
    student?.tuition_id || sharedTuition?.id || null
  );

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <StudentPortalAuth onAuthSuccess={() => window.location.reload()} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Shared access mode - show student selector if no student selected
  if (isSharedAccess && !selectedStudentId) {
    return (
      <StudentPortalSelector
        students={allStudents.map(s => ({
          id: s.id,
          name: s.name,
          class: s.class,
          avatar: s.avatar,
          division: s.divisions
        }))}
        tuitionName={sharedTuition?.name || 'Student Portal'}
        onSelectStudent={(s) => setSelectedStudentId(s.id)}
        onSignOut={signOut}
      />
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Student Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your email ({user.email}) is not linked to any student profile. Please contact your tuition administrator to get access.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const studentResults = testResults.map(result => {
    const test = tests.find(t => t.id === result.test_id);
    return {
      ...result,
      test,
      percentage: test ? (result.marks / test.max_marks) * 100 : 0
    };
  }).filter(r => r.test);

  const recentTests = studentResults.slice(0, 5);
  const averageScore = studentResults.length > 0 
    ? studentResults.reduce((sum, r) => sum + r.percentage, 0) / studentResults.length 
    : 0;

  const totalAttendanceDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

  // Group attendance by subject
  const attendanceBySubject = attendance.reduce((acc, record) => {
    const subjectId = record.subject_id || 'general';
    if (!acc[subjectId]) {
      acc[subjectId] = { total: 0, present: 0 };
    }
    acc[subjectId].total++;
    if (record.status === 'present') acc[subjectId].present++;
    return acc;
  }, {} as Record<string, { total: number; present: number }>);

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const paidFees = fees.filter(f => f.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const pendingFees = fees.filter(f => f.status === 'unpaid' || f.status === 'overdue');

  const displayTuition = sharedTuition || tuition;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Platform Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          {isSharedAccess && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedStudentId(null)}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{displayTuition?.name || 'Student Portal'}</h2>
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-indigo-600">Upskillr Tutly</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      {/* Student Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={student.avatar || undefined} />
          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">Class: {student.class}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
            <Progress value={attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
            <Progress value={averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.total_xp}</div>
            <p className="text-xs text-muted-foreground mt-1">Gamification points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalFees - paidFees).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingFees.length} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span className="hidden sm:inline">Leaderboard</span>
            <span className="sm:hidden">Rank</span>
          </TabsTrigger>
          <TabsTrigger value="announcements">News</TabsTrigger>
        </TabsList>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTests.length > 0 ? (
                <div className="space-y-3">
                  {recentTests.map((result) => (
                    <div key={result.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{result.test?.name}</div>
                        <div className="text-sm text-muted-foreground">{result.test?.subject}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{result.marks}/{result.test?.max_marks}</div>
                        <Badge variant={result.percentage >= 80 ? 'default' : result.percentage >= 60 ? 'secondary' : 'destructive'}>
                          {result.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No test results yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(attendanceBySubject).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(attendanceBySubject).map(([subjectId, stats]) => {
                    const subject = subjects.find(s => s.id === subjectId);
                    const rate = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                    return (
                      <div key={subjectId} className="p-3 border rounded">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">{subject?.name || 'General'}</div>
                          <Badge variant={rate >= 75 ? 'default' : rate >= 60 ? 'secondary' : 'destructive'}>
                            {rate.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                          <span>Present: {stats.present}</span>
                          <span>Total: {stats.total}</span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>Fee Status</CardTitle>
            </CardHeader>
            <CardContent>
              {fees.length > 0 ? (
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{fee.fee_type || 'Tuition Fee'}</div>
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(fee.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₹{fee.amount.toFixed(2)}</div>
                        <Badge variant={
                          fee.status === 'paid' ? 'default' :
                          fee.status === 'overdue' ? 'destructive' : 'secondary'
                        }>
                          {fee.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No fee records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          {leaderboardLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <StudentPortalLeaderboard
              students={leaderboardStudents.map(s => ({
                id: s.id,
                name: s.name,
                class: s.class,
                avatar: s.avatar,
                totalXp: s.totalXp,
                tuitionId: student.tuition_id,
                division: s.division ? { id: s.division.id, name: s.division.name, class: s.class, createdAt: '' } : undefined,
                divisionId: s.division?.id,
                xp: { blackout: 0, futureMe: 0, recallWar: 0 },
                purchasedRewards: [],
                team: null,
                badges: [],
              }))}
              currentStudentId={student.id}
              classFilter={student.class}
            />
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 border rounded">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge variant="outline">
                          {new Date(announcement.published_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {announcement.body}
                      </p>
                      {announcement.xp_bonus && announcement.xp_bonus > 0 && (
                        <div className="mt-2">
                          <Badge variant="default" className="gap-1">
                            <Award className="h-3 w-3" />
                            +{announcement.xp_bonus} XP Bonus
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No announcements yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
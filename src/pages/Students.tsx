import { useState, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTuitionFeatures } from '@/hooks/useTuitionFeatures';
import { useTermExamData } from '@/hooks/useTermExamData';
import { useStudentAttendanceQuery } from '@/hooks/queries';
import { useUserTuition } from '@/hooks/useUserTuition';
import { Student, Division } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, GraduationCap, Flame } from 'lucide-react';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { BulkImportStudentsDialog } from '@/components/BulkImportStudentsDialog';
import { StudentDetailsDialog } from '@/components/StudentDetailsDialog';
import { useAttendanceStreak } from '@/hooks/useAttendanceStreak';
import { StudentsPageSkeleton } from '@/components/skeletons/PageSkeletons';

export default function StudentsPage() {
  const { 
    students, 
    divisions,
    attendance, // Still needed for streak calculation
    testResults,
    weeklyTests,
    fees,
    subjects,
    faculty,
    loading,
    addStudent,
    removeStudent,
    updateStudent,
    assignStudentEmail,
    addXp,
    assignTeam,
    buyReward,
    useReward
  } = useSupabaseData();
  
  const { isFeatureEnabled, loading: featuresLoading } = useTuitionFeatures();
  const { termExams, termExamSubjects, termExamResults, loading: termExamLoading } = useTermExamData();
  const { tuitionId } = useUserTuition();

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch full attendance history for selected student (no 30-day limit)
  const { data: selectedStudentAttendance = [] } = useStudentAttendanceQuery(
    tuitionId, 
    selectedStudent?.id || null
  );

  // Get divisions for selected class
  const availableDivisions = classFilter === "All" 
    ? divisions 
    : divisions.filter(d => d.class === classFilter);

  // Filter students
  const filteredStudents = students.filter(student => {
    const searchMatch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const classMatch = classFilter === "All" || student.class === classFilter;
    const divisionMatch = divisionFilter === "All" || student.divisionId === divisionFilter;
    return searchMatch && classMatch && divisionMatch;
  });

  // Calculate attendance streaks
  const streaks = useAttendanceStreak(attendance);

  // Sort by roll number (students with roll numbers first, then alphabetically)
  // and add attendance streak
  const sortedStudents = useMemo(() => {
    return [...filteredStudents]
      .map(s => ({ ...s, attendanceStreak: streaks[s.id] || 0 }))
      .sort((a, b) => {
        if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
        if (a.rollNo && !b.rollNo) return -1;
        if (!a.rollNo && b.rollNo) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [filteredStudents, streaks]);

  const handleBulkImport = async (studentsToImport: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>[]) => {
    for (const student of studentsToImport) {
      await addStudent(student);
    }
  };

  // Show skeleton during loading
  if (loading || featuresLoading || termExamLoading) {
    return <StudentsPageSkeleton />;
  }

  const showBulkImport = isFeatureEnabled('bulk_import');
  const showGamification = isFeatureEnabled('gamification');

  return (
    <div className="w-full px-3 py-4 sm:px-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage and view student details</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showBulkImport && <BulkImportStudentsDialog divisions={divisions} onImportStudents={handleBulkImport} />}
          <AddStudentDialog divisions={divisions} onAddStudent={addStudent} />
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={classFilter} onValueChange={(value) => {
                setClassFilter(value);
                setDivisionFilter("All");
              }}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  <SelectItem value="4th">4th</SelectItem>
                  <SelectItem value="5th">5th</SelectItem>
                  <SelectItem value="6th">6th</SelectItem>
                  <SelectItem value="7th">7th</SelectItem>
                  <SelectItem value="8th">8th</SelectItem>
                  <SelectItem value="9th">9th</SelectItem>
                  <SelectItem value="10th">10th</SelectItem>
                  <SelectItem value="11th">11th</SelectItem>
                  <SelectItem value="12th">12th</SelectItem>
                </SelectContent>
              </Select>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Divisions</SelectItem>
                  {availableDivisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold">{filteredStudents.length}</div>
            <div className="text-xs text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <GraduationCap className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-xl font-bold">{students.length}</div>
            <div className="text-xs text-muted-foreground">Total Enrolled</div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Students ({sortedStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first student to get started'}
              </p>
              {!searchQuery && (
                <div className="flex flex-wrap justify-center gap-2">
                  {showBulkImport && <BulkImportStudentsDialog divisions={divisions} onImportStudents={handleBulkImport} />}
                  <AddStudentDialog divisions={divisions} onAddStudent={addStudent} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-all border border-transparent hover:border-primary/30"
                  onClick={() => setSelectedStudent(student)}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/30">
                    <AvatarImage src={student.avatar} alt={student.name} />
                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {student.rollNo && <span className="text-muted-foreground mr-1">#{student.rollNo}</span>}
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{student.class} Grade</span>
                      {student.division && (
                        <Badge variant="outline" className="text-xs">{student.division.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {showGamification && (
                      <p className="font-bold text-sm text-primary">{student.totalXp} XP</p>
                    )}
                    <div className="flex items-center gap-1">
                      {showGamification && student.attendanceStreak > 0 && (
                        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-500 text-xs gap-1">
                          <Flame className="h-3 w-3" />
                          {student.attendanceStreak}
                        </Badge>
                      )}
                      {student.team && (
                        <Badge variant="secondary" className="text-xs">{student.team}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      {selectedStudent && (
        <StudentDetailsDialog
          student={selectedStudent}
          attendance={selectedStudentAttendance}
          testResults={testResults.filter(r => r.studentId === selectedStudent.id)}
          tests={weeklyTests}
          fees={fees.filter(f => f.studentId === selectedStudent.id)}
          subjects={subjects}
          faculty={faculty}
          divisions={divisions}
          termExams={termExams.filter(te => te.class === selectedStudent.class)}
          termExamSubjects={termExamSubjects}
          termExamResults={termExamResults.filter(r => r.studentId === selectedStudent.id)}
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          onRemoveStudent={removeStudent}
          onUpdateStudent={updateStudent}
          onStudentDataUpdated={() => {
            // Refresh student data after portal access is enabled
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Student, XPCategory, TeamName, Division, StudentAttendance, StudentTestResult, WeeklyTest, StudentFee, Subject, Faculty } from "@/types";
import { StudentRow } from "./StudentRow";
import { AddStudentDialog } from "./AddStudentDialog";
import { BulkImportStudentsDialog } from "./BulkImportStudentsDialog";
import { StudentDetailsDialog } from "./StudentDetailsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trophy, Star, Search } from "lucide-react";
import { useAttendanceStreak } from "@/hooks/useAttendanceStreak";

interface LeaderboardProps {
  students: Student[];
  divisions: Division[];
  attendance?: StudentAttendance[];
  testResults?: StudentTestResult[];
  weeklyTests?: WeeklyTest[];
  fees?: StudentFee[];
  subjects?: Subject[];
  faculty?: Faculty[];
  onAddStudent: (student: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => void;
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onReduceXp: (studentId: string, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
  onBuyReward: (studentId: string, reward: any) => void;
  onUseReward: (studentId: string, rewardInstanceId: string) => void;
  onAssignTeam: (studentId: string, team: TeamName | null) => void;
}

export function Leaderboard({ 
  students,
  divisions,
  attendance = [],
  testResults = [],
  weeklyTests = [],
  fees = [],
  subjects = [],
  faculty = [],
  onAddStudent,
  onAddXp,
  onReduceXp,
  onRemoveStudent, 
  onBuyReward, 
  onUseReward,
  onAssignTeam 
}: LeaderboardProps) {
  const [classFilter, setClassFilter] = useState("All");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Calculate attendance streaks
  const streaks = useAttendanceStreak(attendance);

  // Get divisions for selected class
  const availableDivisions = classFilter === "All" 
    ? divisions 
    : divisions.filter(d => d.class === classFilter);

  // Filter students
  const filteredStudents = students.filter(student => {
    const classMatch = classFilter === "All" || student.class === classFilter;
    const divisionMatch = divisionFilter === "All" || student.divisionId === divisionFilter;
    const teamMatch = teamFilter === "All" || student.team === teamFilter;
    const searchMatch = !searchQuery || student.name.toLowerCase().includes(searchQuery.toLowerCase());
    return classMatch && divisionMatch && teamMatch && searchMatch;
  });

  // Add attendance streak to students and sort by total XP
  const sortedStudents = useMemo(() => {
    return [...filteredStudents]
      .map(s => ({ ...s, attendanceStreak: streaks[s.id] || 0 }))
      .sort((a, b) => b.totalXp - a.totalXp);
  }, [filteredStudents, streaks]);

  const handleBulkImport = async (studentsToImport: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>[]) => {
    for (const student of studentsToImport) {
      await onAddStudent(student);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-primary">Student Leaderboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Track student progress and manage XP</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImportStudentsDialog divisions={divisions} onImportStudents={handleBulkImport} />
          <AddStudentDialog divisions={divisions} onAddStudent={onAddStudent} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Class:</span>
              <Select value={classFilter} onValueChange={(value) => {
                setClassFilter(value);
                setDivisionFilter("All");
              }}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
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
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Division:</span>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {availableDivisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Team:</span>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                  <SelectItem value="Bravo">Bravo</SelectItem>
                  <SelectItem value="Charlie">Charlie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-2 sm:p-4 text-center">
            <Users className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-blue-500" />
            <div className="text-base sm:text-2xl font-bold">{filteredStudents.length}</div>
            <div className="text-[10px] sm:text-sm text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-4 text-center">
            <Trophy className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-yellow-500" />
            <div className="text-base sm:text-2xl font-bold">
              {sortedStudents.length > 0 ? sortedStudents[0].totalXp : 0}
            </div>
            <div className="text-[10px] sm:text-sm text-muted-foreground">Highest</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-4 text-center">
            <Star className="h-4 w-4 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-purple-500" />
            <div className="text-base sm:text-2xl font-bold">
              {Math.round(filteredStudents.reduce((sum, s) => sum + s.totalXp, 0) / (filteredStudents.length || 1))}
            </div>
            <div className="text-[10px] sm:text-sm text-muted-foreground">Average</div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle>Students</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">Add your first student to get started</p>
              <div className="flex flex-wrap justify-center gap-2">
                <BulkImportStudentsDialog divisions={divisions} onImportStudents={handleBulkImport} />
                <AddStudentDialog divisions={divisions} onAddStudent={onAddStudent} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-4">
              {sortedStudents.map((student, index) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  rank={index + 1}
                  onAddXp={onAddXp}
                  onReduceXp={onReduceXp}
                  onRemoveStudent={onRemoveStudent}
                  onBuyReward={onBuyReward}
                  onUseReward={onUseReward}
                  onAssignTeam={onAssignTeam}
                  onViewDetails={() => setSelectedStudent(student)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Details Dialog */}
      {selectedStudent && (
        <StudentDetailsDialog
          student={selectedStudent}
          attendance={attendance.filter(a => a.studentId === selectedStudent.id)}
          testResults={testResults.filter(r => r.studentId === selectedStudent.id)}
          tests={weeklyTests}
          fees={fees.filter(f => f.studentId === selectedStudent.id)}
          subjects={subjects}
          faculty={faculty}
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          onRemoveStudent={onRemoveStudent}
        />
      )}
    </div>
  );
}

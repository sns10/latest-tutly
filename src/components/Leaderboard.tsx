import { useState } from "react";
import { Student, XPCategory, TeamName } from "@/types";
import { StudentRow } from "./StudentRow";
import { AddStudentDialog } from "./AddStudentDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trophy, Star, Plus } from "lucide-react";

interface LeaderboardProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => void;
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
  onBuyReward: (studentId: string, reward: any) => void;
  onUseReward: (studentId: string, rewardInstanceId: string) => void;
  onAssignTeam: (studentId: string, team: TeamName | null) => void;
}

export function Leaderboard({ 
  students, 
  onAddStudent,
  onAddXp, 
  onRemoveStudent, 
  onBuyReward, 
  onUseReward,
  onAssignTeam 
}: LeaderboardProps) {
  const [classFilter, setClassFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");

  // Filter students
  const filteredStudents = students.filter(student => {
    const classMatch = classFilter === "All" || student.class === classFilter;
    const teamMatch = teamFilter === "All" || student.team === teamFilter;
    return classMatch && teamMatch;
  });

  // Sort by total XP
  const sortedStudents = [...filteredStudents].sort((a, b) => b.totalXp - a.totalXp);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Student Leaderboard</h2>
          <p className="text-muted-foreground">Track student progress and manage XP</p>
        </div>
        <AddStudentDialog onAddStudent={onAddStudent} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Class:</span>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="8th">8th</SelectItem>
                  <SelectItem value="9th">9th</SelectItem>
                  <SelectItem value="10th">10th</SelectItem>
                  <SelectItem value="11th">11th</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Team:</span>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-32">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{filteredStudents.length}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">
              {sortedStudents.length > 0 ? sortedStudents[0].totalXp : 0}
            </div>
            <div className="text-sm text-muted-foreground">Highest XP</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">
              {Math.round(filteredStudents.reduce((sum, s) => sum + s.totalXp, 0) / (filteredStudents.length || 1))}
            </div>
            <div className="text-sm text-muted-foreground">Average XP</div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">Add your first student to get started</p>
              <AddStudentDialog onAddStudent={onAddStudent} />
            </div>
          ) : (
            <div className="space-y-4">
              {sortedStudents.map((student, index) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  rank={index + 1}
                  onAddXp={onAddXp}
                  onRemoveStudent={onRemoveStudent}
                  onBuyReward={onBuyReward}
                  onUseReward={onUseReward}
                  onAssignTeam={onAssignTeam}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

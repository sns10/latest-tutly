import { Student } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Flame } from "lucide-react";

interface LeaderboardStudent extends Omit<Student, 'tuitionId' | 'xp' | 'purchasedRewards' | 'team' | 'badges'> {
  attendanceStreak?: number;
}

interface StudentPortalLeaderboardProps {
  students: LeaderboardStudent[];
  currentStudentId: string;
  classFilter?: string;
}

export function StudentPortalLeaderboard({
  students,
  currentStudentId,
  classFilter,
}: StudentPortalLeaderboardProps) {
  // Filter students by class if specified
  const filteredStudents = classFilter
    ? students.filter((s) => s.class === classFilter)
    : students;

  // Sort by XP descending
  const sortedStudents = [...filteredStudents].sort(
    (a, b) => b.totalXp - a.totalXp
  );

  // Find current student's rank
  const currentStudentRank =
    sortedStudents.findIndex((s) => s.id === currentStudentId) + 1;

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2)
      return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3)
      return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBgClass = (rank: number, isCurrentStudent: boolean) => {
    if (isCurrentStudent) return "bg-primary/10 border-primary";
    if (rank === 1) return "bg-yellow-50 border-yellow-200";
    if (rank === 2) return "bg-gray-50 border-gray-200";
    if (rank === 3) return "bg-amber-50 border-amber-200";
    return "bg-background border-border";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          {currentStudentRank > 0 && (
            <Badge variant="secondary">
              Your Rank: #{currentStudentRank}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {classFilter ? `${classFilter} Grade` : "All Classes"} • Top performers
          by XP
        </p>
      </CardHeader>
      <CardContent>
        {sortedStudents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No students in leaderboard yet
          </p>
        ) : (
          <div className="space-y-2">
            {sortedStudents.slice(0, 20).map((student, index) => {
              const rank = index + 1;
              const isCurrentStudent = student.id === currentStudentId;

              return (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getRankBgClass(
                    rank,
                    isCurrentStudent
                  )} ${isCurrentStudent ? "ring-2 ring-primary/30" : ""}`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(rank) || (
                      <span className="text-sm font-bold text-muted-foreground">
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={student.avatar} alt={student.name} />
                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* Name & Class */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium truncate ${
                          isCurrentStudent ? "text-primary" : ""
                        }`}
                      >
                        {student.name}
                        {isCurrentStudent && (
                          <span className="text-xs ml-1">(You)</span>
                        )}
                      </p>
                      {/* Streak Badge */}
                      {student.attendanceStreak !== undefined && (
                        <Badge
                          variant="outline"
                          className="gap-1 bg-orange-50 text-orange-600 border-orange-200 text-xs shrink-0"
                        >
                          <Flame className="h-3 w-3" />
                          {student.attendanceStreak}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {student.class} Grade
                      {student.division && ` • Div ${student.division.name}`}
                    </p>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="font-bold text-primary">
                        {student.totalXp}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </div>
              );
            })}

            {sortedStudents.length > 20 && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                Showing top 20 of {sortedStudents.length} students
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

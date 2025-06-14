
import { Student, XPCategory, Reward } from "@/types";
import { StudentRow } from "./StudentRow";

interface LeaderboardProps {
  students: Student[];
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
  onBuyReward: (studentId: string, reward: Reward) => void;
  onUseReward: (studentId: string, rewardInstanceId: string) => void;
}

export function Leaderboard({ students, onAddXp, onRemoveStudent, onBuyReward, onUseReward }: LeaderboardProps) {
  const sortedStudents = [...students].sort((a, b) => b.totalXp - a.totalXp);

  return (
    <div className="space-y-3">
      {sortedStudents.length > 0 ? (
        sortedStudents.map((student, index) => (
          <StudentRow 
            key={student.id} 
            student={student} 
            rank={index + 1}
            onAddXp={onAddXp}
            onRemoveStudent={onRemoveStudent}
            onBuyReward={onBuyReward}
            onUseReward={onUseReward}
          />
        ))
      ) : (
        <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-lg">
          <p className="font-bold">No students found!</p>
          <p className="text-sm">Add a student to get started.</p>
        </div>
      )}
    </div>
  );
}


import { Student, XPCategory } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Award, Plus, Trash2 } from "lucide-react";

interface StudentRowProps {
  student: Student;
  rank: number;
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
}

const rankColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-600";
  return "text-primary/70";
};

const xpCategoryDetails = {
  blackout: { label: "Blackout", points: 10, color: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" },
  futureMe: { label: "Future Me", points: 20, color: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
  recallWar: { label: "Recall War", points: 50, color: "bg-red-500/20 text-red-400 hover:bg-red-500/30" },
}

export function StudentRow({ student, rank, onAddXp, onRemoveStudent }: StudentRowProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all border border-transparent hover:border-primary/50">
      <div className={`w-10 text-xl font-bold font-display text-center ${rankColor(rank)}`}>
        {rank}
      </div>
      <Avatar className="h-12 w-12 border-2 border-primary/50">
        <AvatarImage src={student.avatar} alt={student.name} />
        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold text-lg text-foreground">{student.name}</p>
        <p className="text-sm text-muted-foreground">{student.class} Grade</p>
      </div>
      <div className="text-2xl font-bold font-display text-primary">{student.totalXp.toLocaleString()} <span className="text-sm font-sans text-primary/70">XP</span></div>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 hover:text-primary">
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 border-primary/50">
          <div className="flex gap-2">
            {Object.entries(xpCategoryDetails).map(([key, value]) => (
              <Button key={key} onClick={() => onAddXp(student.id, key as XPCategory, value.points)} className={`${value.color} font-bold`}>
                +{value.points}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      <Button variant="ghost" size="icon" className="text-red-500/70 hover:bg-red-500/10 hover:text-red-500" onClick={() => onRemoveStudent(student.id)}>
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

import { Student } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award } from "lucide-react";
interface WeeklyMVPProps {
  student: Student | null;
}
export function WeeklyMVP({
  student
}: WeeklyMVPProps) {
  if (!student) {
    return <div className="p-6 rounded-xl bg-gradient-to-tr from-accent/20 to-primary/20 border border-accent/50 text-center">
        <h2 className="text-2xl font-display font-bold text-accent">Weekly MVP</h2>
        <p className="text-muted-foreground mt-2">No students yet. The throne awaits!</p>
      </div>;
  }
  return <div className="relative p-6 rounded-xl bg-gradient-to-tr from-accent/20 to-primary/20 border-2 border-accent overflow-hidden">
        <div className="absolute -top-4 -right-4 text-accent/20">
            <Award size={128} />
        </div>
      <h2 className="text-2xl font-display font-bold animate-glow text-zinc-50">Weekly MVP</h2>
      <div className="flex items-center gap-4 mt-4 relative z-10">
        <Avatar className="h-20 w-20 border-4 border-accent shadow-lg shadow-accent/20">
          <AvatarImage src={student.avatar} alt={student.name} />
          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-3xl font-bold font-display text-foreground">{student.name}</p>
          <p className="text-lg font-semibold text-zinc-50">{student.totalXp.toLocaleString()} XP</p>
        </div>
      </div>
    </div>;
}
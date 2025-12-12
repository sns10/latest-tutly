import { Student, XPCategory, Reward, TeamName } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Trash2, Users, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportExporter } from "./ReportExporter";

interface StudentRowProps {
  student: Student;
  rank: number;
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onReduceXp: (studentId: string, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
  onBuyReward: (studentId: string, reward: Reward) => void;
  onUseReward: (studentId: string, rewardInstanceId: string) => void;
  onAssignTeam: (studentId: string, team: TeamName | null) => void;
  onViewDetails?: () => void;
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
  recallWar: { label: "Recall War", points: 50, color: "bg-red-500/20 text-red-400 hover:bg-red-500/30" }
}

const teamNames: TeamName[] = ["Alpha", "Bravo", "Charlie"];

export function StudentRow({ student, rank, onAddXp, onReduceXp, onRemoveStudent, onBuyReward, onUseReward, onAssignTeam, onViewDetails }: StudentRowProps) {
  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all border border-transparent hover:border-primary/50 cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Top row on mobile: rank + avatar + name + XP */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <div className={`w-8 sm:w-10 text-lg sm:text-xl font-bold font-display text-center flex-shrink-0 ${rankColor(rank)}`}>
          {rank}
        </div>
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/50 flex-shrink-0">
          <AvatarImage src={student.avatar} alt={student.name} />
          <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-lg text-foreground truncate">
            {student.rollNo && <span className="text-muted-foreground mr-1">#{student.rollNo}</span>}
            {student.name}
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
            <p className="text-xs sm:text-sm text-muted-foreground">{student.class} Grade</p>
            {student.division && (
              <Badge variant="outline" className="border-primary/20 font-semibold text-xs">{student.division.name}</Badge>
            )}
            {student.team && (
               <Badge variant="outline" className="border-primary/20 font-semibold text-xs">{student.team}</Badge>
            )}
            {student.attendanceStreak !== undefined && student.attendanceStreak > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-500 font-semibold text-xs gap-1">
                      <Flame className="h-3 w-3" />
                      {student.attendanceStreak}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="border-primary/30 bg-background">
                    <p>{student.attendanceStreak} day attendance streak!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <Popover>
              <PopoverTrigger asChild>
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-primary/70 hover:bg-primary/10 hover:text-primary">
                                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent className="border-primary/30 bg-background">
                              <p>Assign Team</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-4 border-primary/50">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none font-display text-primary">Assign Team</h4>
                    <p className="text-sm text-muted-foreground">
                      Assign {student.name} to a team.
                    </p>
                  </div>
                  <Select 
                    onValueChange={(value: TeamName | 'no-team') => onAssignTeam(student.id, value === 'no-team' ? null : value)} 
                    defaultValue={student.team || 'no-team'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-team">No Team</SelectItem>
                      {teamNames.map(team => <SelectItem key={team} value={team}>{team} Team</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            {student.badges && student.badges.length > 0 && (
              <div className="flex gap-1">
                <TooltipProvider>
                  {student.badges.map((badge) => (
                    <Tooltip key={badge.id}>
                      <TooltipTrigger asChild>
                        <span className="text-sm sm:text-lg bg-secondary px-1 py-0.5 rounded-md cursor-default hover:scale-110 transition-transform">
                          {badge.emoji}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="border-primary/30 bg-background">
                        <p className="font-semibold">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground italic">Earned: {new Date(badge.dateEarned).toLocaleDateString()}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            )}
            {student.purchasedRewards && student.purchasedRewards.length > 0 && (
              <div className="flex gap-1">
                <TooltipProvider>
                  {student.purchasedRewards.map((reward) => (
                    <Tooltip key={reward.instanceId}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { if(window.confirm(`Are you sure you want to use "${reward.name}"? This action cannot be undone.`)) onUseReward(student.id, reward.instanceId) }}
                          className="text-sm sm:text-lg bg-secondary px-1 py-0.5 rounded-md hover:scale-110 transition-transform"
                        >
                          {reward.emoji}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="border-primary/30 bg-background">
                        <p className="font-semibold">Use '{reward.name}'</p>
                        <p className="text-xs text-muted-foreground">{reward.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-bold font-display text-primary whitespace-nowrap flex-shrink-0">{student.totalXp.toLocaleString()} <span className="text-xs sm:text-sm font-sans text-primary/70">XP</span></div>
      </div>
      
      {/* Action buttons row on mobile */}
      <div className="flex gap-1 sm:gap-1 justify-end sm:justify-start flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-primary hover:bg-primary/10 hover:text-primary">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 border-primary/50">
            <div className="flex gap-2">
              {Object.entries(xpCategoryDetails).map(([key, value]) => (
                <Button key={key} onClick={() => onAddXp(student.id, key as XPCategory, value.points)} className={`${value.color} font-bold text-xs sm:text-sm`}>
                  +{value.points}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-red-400 hover:bg-red-400/10 hover:text-red-400">
              <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 border-primary/50">
            <div className="flex gap-2">
              <Button onClick={() => onReduceXp(student.id, 5)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-xs sm:text-sm">
                -5
              </Button>
              <Button onClick={() => onReduceXp(student.id, 10)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-xs sm:text-sm">
                -10
              </Button>
              <Button onClick={() => onReduceXp(student.id, 20)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold text-xs sm:text-sm">
                -20
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <ReportExporter
          type="student-report"
          studentId={student.id}
          variant="ghost"
          size="icon"
        />
        <ReportExporter
          type="attendance-calendar"
          studentId={student.id}
          variant="ghost"
          size="icon"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-red-500/70 hover:bg-red-500/10 hover:text-red-500" onClick={() => onRemoveStudent(student.id)}>
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
}

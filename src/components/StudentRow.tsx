
import { Student, XPCategory, Reward } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Gift } from "lucide-react";
import { XP_STORE_ITEMS } from "@/config/rewards";
import { Badge } from "@/components/ui/badge";

interface StudentRowProps {
  student: Student;
  rank: number;
  onAddXp: (studentId: string, category: XPCategory, amount: number) => void;
  onRemoveStudent: (studentId: string) => void;
  onBuyReward: (studentId: string, reward: Reward) => void;
  onUseReward: (studentId: string, rewardInstanceId: string) => void;
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

export function StudentRow({ student, rank, onAddXp, onRemoveStudent, onBuyReward, onUseReward }: StudentRowProps) {
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
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-sm text-muted-foreground">{student.class} Grade</p>
          {student.team && (
             <Badge variant="outline" className="border-primary/20 font-semibold">{student.team} Team</Badge>
          )}
          {student.badges && student.badges.length > 0 && (
            <div className="flex gap-1.5">
              <TooltipProvider>
                {student.badges.map((badge) => (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <span className="text-lg bg-secondary px-1.5 py-0.5 rounded-md cursor-default hover:scale-110 transition-transform">
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
            <div className="flex gap-1.5">
              <TooltipProvider>
                {student.purchasedRewards.map((reward) => (
                  <Tooltip key={reward.instanceId}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { if(window.confirm(`Are you sure you want to use "${reward.name}"? This action cannot be undone.`)) onUseReward(student.id, reward.instanceId) }}
                        className="text-lg bg-secondary px-1.5 py-0.5 rounded-md hover:scale-110 transition-transform"
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
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-amber-400 hover:bg-amber-400/10 hover:text-amber-400">
            <Gift className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 border-primary/50" side="left">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none font-display text-primary">XP Store</h4>
              <p className="text-sm text-muted-foreground">
                Redeem XP for cool rewards!
              </p>
            </div>
            <div className="grid gap-3">
              {XP_STORE_ITEMS.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4">
                  <div>
                    <p className="font-semibold">{item.emoji} {item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Button
                    onClick={() => onBuyReward(student.id, item)}
                    disabled={student.totalXp < item.cost}
                    size="sm"
                    className="font-bold"
                  >
                    {item.cost} <span className="text-xs ml-1 font-sans text-primary-foreground/70">XP</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="text-red-500/70 hover:bg-red-500/10 hover:text-red-500" onClick={() => onRemoveStudent(student.id)}>
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

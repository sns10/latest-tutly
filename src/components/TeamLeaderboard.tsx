
import { TeamName } from "@/types";
import { Users } from "lucide-react";

interface TeamLeaderboardProps {
    scores: Record<TeamName, number>;
}

const teamDetails: Record<TeamName, { color: string, iconColor: string }> = {
    Alpha: { color: "bg-red-500/20", iconColor: "text-red-400" },
    Bravo: { color: "bg-blue-500/20", iconColor: "text-blue-400" },
    Charlie: { color: "bg-green-500/20", iconColor: "text-green-400" },
}

export function TeamLeaderboard({ scores }: TeamLeaderboardProps) {
    const sortedTeams = (Object.keys(scores) as TeamName[]).sort((a,b) => scores[b] - scores[a]);

    return (
        <div className="p-4 rounded-xl bg-secondary/30">
            <h3 className="font-bold text-lg font-display text-primary/90 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary/80" />
                Team Standings
            </h3>
            <ul className="mt-3 space-y-2">
                {sortedTeams.map((team) => (
                    <li key={team} className={`flex items-center justify-between p-2 rounded-lg ${teamDetails[team].color}`}>
                        <div className="flex items-center gap-3">
                             <div className={`p-1.5 rounded-md ${teamDetails[team].color}`}>
                                <Users className={`h-5 w-5 ${teamDetails[team].iconColor}`} />
                            </div>
                            <span className={`font-semibold ${teamDetails[team].iconColor}`}>{team} Team</span>
                        </div>
                        <span className="font-bold text-lg font-display text-foreground">{scores[team].toLocaleString()} <span className="text-sm font-sans text-muted-foreground">XP</span></span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

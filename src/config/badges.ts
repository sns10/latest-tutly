
import { Badge, Student } from "@/types";

export interface BadgeDefinition extends Omit<Badge, 'dateEarned' | 'id'> {
    id: string;
    criteria: (student: Student) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: 'first-100-xp',
        name: 'Century Club',
        description: 'Earned over 100 XP',
        emoji: '💯',
        criteria: (student) => student.totalXp >= 100,
    },
    // Future badges can be added here
];

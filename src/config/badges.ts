
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
    {
        id: 'top-scorer',
        name: 'Top Scorer',
        description: 'Was one of the top scorers in a weekly test',
        emoji: '🏆',
        criteria: () => false, // To be implemented
    },
    {
        id: 'most-improved',
        name: 'Most Improved',
        description: 'Shown significant improvement in a weekly test',
        emoji: '🚀',
        criteria: () => false, // To be implemented
    },
    // Future badges can be added here
];

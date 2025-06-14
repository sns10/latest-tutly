
export type ClassName = "8th" | "9th" | "10th" | "11th" | "All";

export type XPCategory = "blackout" | "futureMe" | "recallWar";

export type RewardId = "streak-freeze" | "recall-shield" | "double-xp" | "question-master";

export interface Reward {
  id: RewardId;
  name: string;
  cost: number;
  description: string;
  emoji: string;
}

export interface PurchasedReward extends Reward {
  instanceId: string;
}

export type TeamName = "Alpha" | "Bravo" | "Charlie";

export type BadgeId = "first-100-xp" | "mvp-of-the-week" | "team-player" | "streak-master" | string;

export interface Badge {
    id: BadgeId;
    name: string;
    description: string;
    emoji: string;
    dateEarned: string;
}

export interface Student {
  id: string;
  name: string;
  class: ClassName;
  avatar: string;
  xp: {
    blackout: number;
    futureMe: number;
    recallWar: number;
  };
  totalXp: number;
  purchasedRewards: PurchasedReward[];
  team: TeamName | null;
  badges: Badge[];
}

export interface WeeklyTest {
  id: string;
  name: string;
  subject: string;
  maxMarks: number;
  date: string; // ISO date string
  class: ClassName; // Added class field
}

export interface StudentTestResult {
  testId: string;
  studentId: string;
  marks: number;
}

// New types for challenges and announcements
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  xpReward: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StudentChallenge {
  id: string;
  studentId: string;
  challengeId: string;
  completedAt: string;
  status: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  createdBy: string | null;
  targetClass: string | null;
  xpBonus: number | null;
}

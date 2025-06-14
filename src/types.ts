
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
}

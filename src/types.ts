
export type ClassName = "8th" | "9th" | "10th" | "11th" | "All";

export type XPCategory = "blackout" | "futureMe" | "recallWar";

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
}

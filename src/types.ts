export type ClassName = "8th" | "9th" | "10th" | "11th" | "12th" | "All";

export interface Division {
  id: string;
  class: ClassName;
  name: string;
  createdAt: string;
}

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
  divisionId?: string;
  division?: Division;
  avatar: string;
  email?: string;
  rollNo?: number;
  xp: {
    blackout: number;
    futureMe: number;
    recallWar: number;
  };
  totalXp: number;
  purchasedRewards: PurchasedReward[];
  team: TeamName | null;
  badges: Badge[];
  attendanceStreak?: number;
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

// New types for attendance and fees
export interface StudentAttendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  subjectId?: string;
  facultyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFee {
  id: string;
  studentId: string;
  feeType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'paid' | 'unpaid' | 'partial' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassFee {
  class: ClassName;
  amount: number;
}

// Term Exam Types
export interface TermExam {
  id: string;
  name: string;
  term: '1st Term' | '2nd Term' | '3rd Term';
  class: ClassName;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TermExamSubject {
  id: string;
  termExamId: string;
  subjectId: string;
  maxMarks: number;
  examDate?: string;
  subject?: Subject;
  createdAt: string;
}

export interface TermExamResult {
  id: string;
  termExamId: string;
  studentId: string;
  subjectId: string;
  marks?: number;
  grade?: string;
  createdAt: string;
  updatedAt: string;
}

// Faculty and Timetable types
export interface Subject {
  id: string;
  name: string;
  class: ClassName;
  createdAt: string;
}

export interface Faculty {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subjects?: Subject[];
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Timetable {
  id: string;
  class: ClassName;
  divisionId?: string;
  division?: Division;
  subjectId: string;
  facultyId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string;
  endTime: string;
  roomNumber?: string;
  roomId?: string;
  type: 'regular' | 'special';
  specificDate?: string; // ISO date string for one-time special classes
  startDate?: string; // ISO date string for date range start
  endDate?: string; // ISO date string for date range end
  eventType?: string; // For special classes: exam_revision, night_class, etc.
  notes?: string;
  subject?: Subject;
  faculty?: Faculty;
  room?: Room;
  createdAt: string;
  updatedAt: string;
}

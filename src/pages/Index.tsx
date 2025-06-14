import { useState, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import { Student, ClassName, XPCategory, Reward, PurchasedReward, Badge, TeamName, WeeklyTest, StudentTestResult } from '@/types';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { Leaderboard } from '@/components/Leaderboard';
import { WeeklyMVP } from '@/components/WeeklyMVP';
import { Button } from '@/components/ui/button';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';
import { BADGE_DEFINITIONS } from '@/config/badges';
import { toast } from "sonner";
import { CreateTestDialog } from '@/components/CreateTestDialog';

const initialStudents: Student[] = [
  { id: '1', name: 'Curious Cat', class: '8th', avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=500&h=500&fit=crop', xp: { blackout: 10, futureMe: 40, recallWar: 100 }, totalXp: 150, purchasedRewards: [], team: 'Alpha', badges: [{ id: 'first-100-xp', name: 'Century Club', description: 'Earned over 100 XP', emoji: '💯', dateEarned: new Date('2025-06-10').toISOString() }] },
  { id: '2', name: 'Clever Kitten', class: '9th', avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=500&h=500&fit=crop', xp: { blackout: 20, futureMe: 80, recallWar: 250 }, totalXp: 350, purchasedRewards: [], team: 'Bravo', badges: [] },
  { id: '3', name: 'Wise Monkey', class: '10th', avatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=500&h=500&fit=crop', xp: { blackout: 30, futureMe: 20, recallWar: 50 }, totalXp: 100, purchasedRewards: [], team: 'Charlie', badges: [] },
  { id: '4', name: 'Chill Penguin', class: '11th', avatar: 'https://images.unsplash.com/photo-1441057206919-63d19fac2369?w=500&h=500&fit=crop', xp: { blackout: 50, futureMe: 100, recallWar: 300 }, totalXp: 450, purchasedRewards: [], team: null, badges: [] },
];

const classFilters: ClassName[] = ["All", "8th", "9th", "10th", "11th"];

const Index = () => {
  const [rawStudents, setStudents] = useLocalStorage<Student[]>('students', initialStudents);
  const [activeFilter, setActiveFilter] = useState<ClassName>("All");
  const [weeklyTests, setWeeklyTests] = useLocalStorage<WeeklyTest[]>('weeklyTests', []);
  const [testResults, setTestResults] = useLocalStorage<StudentTestResult[]>('studentTestResults', []);

  const students = useMemo(() => {
    if (!rawStudents) return [];
    // Data migration for existing students in localStorage
    return rawStudents.map(s => ({
      ...s,
      purchasedRewards: s.purchasedRewards || [],
      team: 'team' in s ? s.team : null,
      badges: s.badges || [],
    }));
  }, [rawStudents]);

  const addStudent = (newStudent: Omit<Student, 'id' | 'xp' | 'totalXp' | 'purchasedRewards' | 'team' | 'badges'>) => {
    const student: Student = {
      ...newStudent,
      id: new Date().toISOString(),
      xp: { blackout: 0, futureMe: 0, recallWar: 0 },
      totalXp: 0,
      purchasedRewards: [],
      team: null,
      badges: [],
    };
    setStudents(prev => [...prev, student]);
  };

  const addWeeklyTest = (newTest: Omit<WeeklyTest, 'id'>) => {
    const test: WeeklyTest = {
      ...newTest,
      id: new Date().toISOString(),
    };
    setWeeklyTests(prev => [...prev, test]);
    toast.success(`Test "${test.name}" created successfully!`);
  };

  const removeStudent = (studentId: string) => {
    if (window.confirm("Are you sure you want to remove this student? This cannot be undone.")) {
      setStudents(prev => prev.filter(s => s.id !== studentId));
    }
  };
  
  const addXp = (studentId: string, category: XPCategory, amount: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newXp = { ...student.xp, [category]: student.xp[category] + amount };
    const totalXp = Object.values(newXp).reduce((sum, val) => sum + val, 0);

    const studentWithNewXp: Student = { ...student, xp: newXp, totalXp };
    
    const awardedBadges: Badge[] = [];
    BADGE_DEFINITIONS.forEach(badgeDef => {
      const hasBadge = student.badges.some(b => b.id === badgeDef.id);
      if (!hasBadge && badgeDef.criteria(studentWithNewXp)) {
        const newBadge: Badge = {
          ...badgeDef,
          id: badgeDef.id as Badge['id'],
          dateEarned: new Date().toISOString(),
        };
        awardedBadges.push(newBadge);
      }
    });

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          xp: newXp,
          totalXp,
          badges: [...s.badges, ...awardedBadges]
        };
      }
      return s;
    }));

    if (awardedBadges.length > 0) {
      awardedBadges.forEach(b => {
        toast.success(`${student.name} earned the "${b.name}" badge! ${b.emoji}`);
      });
    }
  };

  const assignTeam = (studentId: string, team: TeamName | null) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, team };
      }
      return s;
    }));
  };

  const buyReward = (studentId: string, reward: Reward) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId && s.totalXp >= reward.cost) {
        const newPurchasedReward: PurchasedReward = {
          ...reward,
          instanceId: `${reward.id}-${new Date().toISOString()}`
        };
        return {
          ...s,
          totalXp: s.totalXp - reward.cost,
          purchasedRewards: [...(s.purchasedRewards || []), newPurchasedReward]
        };
      }
      return s;
    }));
  };

  const useReward = (studentId: string, rewardInstanceId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          purchasedRewards: s.purchasedRewards.filter(r => r.instanceId !== rewardInstanceId)
        };
      }
      return s;
    }));
  };

  const filteredStudents = useMemo(() => {
    if (activeFilter === "All") return students;
    return students.filter(s => s.class === activeFilter);
  }, [students, activeFilter]);
  
  const weeklyMvp = useMemo(() => {
      if(students.length === 0) return null;
      return [...students].sort((a,b) => b.totalXp - a.totalXp)[0];
  }, [students]);

  const teamScores = useMemo(() => {
    const scores: Record<TeamName, number> = {
      Alpha: 0,
      Bravo: 0,
      Charlie: 0,
    };
    students.forEach(student => {
      if (student.team) {
        scores[student.team] += student.totalXp;
      }
    });
    return scores;
  }, [students]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-black text-primary">LEADERBOARD</h1>
            <p className="text-muted-foreground">Class of 2025</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateTestDialog onAddTest={addWeeklyTest} />
            <AddStudentDialog onAddStudent={addStudent} />
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex gap-2 flex-wrap">
              {classFilters.map(filter => (
                <Button 
                  key={filter} 
                  variant={activeFilter === filter ? 'default' : 'outline'}
                  onClick={() => setActiveFilter(filter)}
                  className={`
                    ${activeFilter === filter 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'}
                  `}
                >
                  {filter === "All" ? "All Classes" : `${filter} Grade`}
                </Button>
              ))}
            </div>
            <Leaderboard students={filteredStudents} onAddXp={addXp} onRemoveStudent={removeStudent} onBuyReward={buyReward} onUseReward={useReward} onAssignTeam={assignTeam} />
          </div>

          <aside className="space-y-6">
            <WeeklyMVP student={weeklyMvp} />
            <TeamLeaderboard scores={teamScores} />
            <div className="p-4 rounded-xl bg-secondary/30">
                <h3 className="font-bold text-lg font-display text-primary/90">XP Categories</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li><span className="font-semibold text-purple-400">Blackout:</span> +10 XP</li>
                    <li><span className="font-semibold text-green-400">Future Me:</span> +20 XP</li>
                    <li><span className="font-semibold text-red-400">Recall War:</span> +50 XP</li>
                </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default Index;

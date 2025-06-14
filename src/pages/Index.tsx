
import { useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { ClassName, TeamName } from '@/types';
import { AddStudentDialog } from '@/components/AddStudentDialog';
import { Leaderboard } from '@/components/Leaderboard';
import { WeeklyMVP } from '@/components/WeeklyMVP';
import { Button } from '@/components/ui/button';
import { TeamLeaderboard } from '@/components/TeamLeaderboard';
import { WeeklyTestManager } from '@/components/WeeklyTestManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TestTube2, LogOut } from "lucide-react";
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

const classFilters: ClassName[] = ["All", "8th", "9th", "10th", "11th"];

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<ClassName>("All");
  
  const {
    students,
    weeklyTests,
    testResults,
    loading: dataLoading,
    addStudent,
    addWeeklyTest,
    addTestResult,
    addXp,
    awardXP,
    removeStudent,
    assignTeam,
    buyReward,
    useReward,
  } = useSupabaseData();

  // Redirect to auth if not authenticated
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const filteredStudents = useMemo(() => {
    if (activeFilter === "All") return students;
    return students.filter(s => s.class === activeFilter);
  }, [students, activeFilter]);
  
  const weeklyMvp = useMemo(() => {
    if (students.length === 0) return null;
    return [...students].sort((a, b) => b.totalXp - a.totalXp)[0];
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

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading classroom data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-black text-primary">CLASSROOM COMMANDER</h1>
            <p className="text-muted-foreground">Gamified Learning & Assessment Platform</p>
            <p className="text-sm text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <AddStudentDialog onAddStudent={addStudent} />
            <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <TestTube2 className="h-4 w-4" />
              Weekly Tests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
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
                <Leaderboard 
                  students={filteredStudents} 
                  onAddXp={addXp} 
                  onRemoveStudent={removeStudent} 
                  onBuyReward={buyReward} 
                  onUseReward={useReward} 
                  onAssignTeam={assignTeam} 
                />
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
          </TabsContent>

          <TabsContent value="tests">
            <WeeklyTestManager 
              tests={weeklyTests}
              testResults={testResults}
              students={students}
              onAddTest={addWeeklyTest}
              onAddTestResult={addTestResult}
              onAwardXP={awardXP}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

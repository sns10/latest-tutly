import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { WeeklyMVP } from "@/components/WeeklyMVP";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/components/AuthProvider";
import { Trophy, Users, BookOpen, Star, LogOut } from "lucide-react";
import { TeamName } from "@/types";

const Index = () => {
  const { signOut, user } = useAuth();
  const {
    students,
    weeklyTests,
    testResults,
    challenges,
    studentChallenges,
    announcements,
    loading,
    addStudent,
    addWeeklyTest,
    addTestResult,
    addXp,
    awardXP,
    removeStudent,
    assignTeam,
    buyReward,
    useReward,
    addChallenge,
    completeChallenge,
    addAnnouncement,
  } = useSupabaseData();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your classroom...</p>
        </div>
      </div>
    );
  }

  // Calculate team scores
  const teamScores: Record<TeamName, number> = {
    Alpha: 0,
    Bravo: 0,
    Charlie: 0,
  };

  students.forEach(student => {
    if (student.team) {
      teamScores[student.team] += student.totalXp;
    }
  });

  // Get the MVP (student with highest XP)
  const mvpStudent = students.length > 0 
    ? students.reduce((prev, current) => (prev.totalXp > current.totalXp) ? prev : current)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Classroom Gamification
            </h1>
            <p className="text-lg text-muted-foreground">
              Making learning fun with XP, challenges, and achievements
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">
                Signed in as: {user.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <AddStudentDialog onAddStudent={addStudent} />
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="management" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="management" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Management
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="mvp" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="h-4 w-4" />
              MVP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="management">
            <WeeklyTestManager
              tests={weeklyTests}
              testResults={testResults}
              students={students}
              challenges={challenges}
              studentChallenges={studentChallenges}
              announcements={announcements}
              onAddTest={addWeeklyTest}
              onAddTestResult={addTestResult}
              onAwardXP={awardXP}
              onAddChallenge={addChallenge}
              onCompleteChallenge={completeChallenge}
              onAddAnnouncement={addAnnouncement}
            />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard
              students={students}
              onAddXp={addXp}
              onRemoveStudent={removeStudent}
              onAssignTeam={assignTeam}
              onBuyReward={buyReward}
              onUseReward={useReward}
            />
          </TabsContent>

          <TabsContent value="teams">
            <TeamLeaderboard scores={teamScores} />
          </TabsContent>

          <TabsContent value="mvp">
            <WeeklyMVP student={mvpStudent} />
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  );
};

export default Index;

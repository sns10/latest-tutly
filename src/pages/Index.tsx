import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { WeeklyMVP } from "@/components/WeeklyMVP";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { SmartboardView } from "@/components/SmartboardView";
import { LiveCompetition } from "@/components/LiveCompetition";
import { InteractiveMiniGames } from "@/components/InteractiveMiniGames";
import { SmartboardNavigation } from "@/components/SmartboardNavigation";
import { PresentationProvider, usePresentationMode } from "@/components/PresentationMode";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/components/AuthProvider";
import { LogOut } from "lucide-react";
import { TeamName } from "@/types";
import { Navigate } from "react-router-dom";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function IndexContent() {
  const { signOut, user, loading: authLoading } = useAuth();
  const { isPresentationMode, textSize } = usePresentationMode();
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
    console.log('Sign out button clicked');
    try {
      await signOut();
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5",
      isPresentationMode && "overflow-hidden"
    )}>
      <div className={cn(
        "container mx-auto px-4 py-8",
        isPresentationMode && "px-8 py-4",
        textSize === 'large' && "text-lg",
        textSize === 'extra-large' && "text-xl"
      )}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={cn(
              "font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2",
              textSize === 'normal' && "text-4xl",
              textSize === 'large' && "text-5xl",
              textSize === 'extra-large' && "text-6xl"
            )}>
              Gamify Pallikoodam
            </h1>
            <p className={cn(
              "text-muted-foreground",
              textSize === 'normal' && "text-lg",
              textSize === 'large' && "text-xl",
              textSize === 'extra-large' && "text-2xl"
            )}>
              created by sanas
            </p>
            {user && (
              <p className={cn(
                "text-muted-foreground mt-1",
                textSize === 'normal' && "text-sm",
                textSize === 'large' && "text-base",
                textSize === 'extra-large' && "text-lg"
              )}>
                Signed in as: {user.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <AddStudentDialog onAddStudent={addStudent} />
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size={isPresentationMode ? "lg" : "sm"}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <SmartboardNavigation defaultValue="management">
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

          <TabsContent value="live-competition">
            <LiveCompetition
              students={students}
              onAwardXP={awardXP}
            />
          </TabsContent>

          <TabsContent value="smartboard">
            <SmartboardView 
              tests={weeklyTests}
              testResults={testResults}
              students={students}
            />
          </TabsContent>

          <TabsContent value="announcements">
            <InteractiveMiniGames
              students={students}
              onAwardXP={awardXP}
            />
          </TabsContent>

          <TabsContent value="reports">
            {/* Keep existing reports content */}
          </TabsContent>
        </SmartboardNavigation>
      </div>
      <Toaster />
    </div>
  );
}

const Index = () => {
  return (
    <PresentationProvider>
      <IndexContent />
    </PresentationProvider>
  );
};

export default Index;

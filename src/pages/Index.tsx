
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { SmartboardNavigation } from "@/components/SmartboardNavigation";
import { WeeklyTestManager } from "@/components/WeeklyTestManager";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { WeeklyMVP } from "@/components/WeeklyMVP";
import { LiveCompetition } from "@/components/LiveCompetition";
import { SmartboardView } from "@/components/SmartboardView";
import { TestResultsView } from "@/components/TestResultsView";
import { PresentationModeProvider } from "@/components/PresentationMode";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const Index = () => {
  const {
    students,
    weeklyTests,
    testResults,
    challenges,
    studentChallenges,
    announcements,
    attendance,
    fees,
    loading,
    addStudent,
    addWeeklyTest,
    deleteWeeklyTest,
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
    markAttendance,
    addFee,
    updateFeeStatus,
  } = useSupabaseData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading school data...</span>
        </div>
      </div>
    );
  }

  return (
    <PresentationModeProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-6">
          <SmartboardNavigation defaultValue="management">
            <TabsContent value="management">
              <WeeklyTestManager
                tests={weeklyTests}
                testResults={testResults}
                students={students}
                challenges={challenges}
                studentChallenges={studentChallenges}
                announcements={announcements}
                attendance={attendance}
                fees={fees}
                onAddTest={addWeeklyTest}
                onDeleteTest={deleteWeeklyTest}
                onAddTestResult={addTestResult}
                onAwardXP={awardXP}
                onAddChallenge={addChallenge}
                onCompleteChallenge={completeChallenge}
                onAddAnnouncement={addAnnouncement}
                onMarkAttendance={markAttendance}
                onAddFee={addFee}
                onUpdateFeeStatus={updateFeeStatus}
              />
            </TabsContent>

            <TabsContent value="leaderboard">
              <Leaderboard
                students={students}
                onAddStudent={addStudent}
                onRemoveStudent={removeStudent}
                onAddXp={addXp}
                onAwardXP={awardXP}
                onBuyReward={buyReward}
                onUseReward={useReward}
              />
            </TabsContent>

            <TabsContent value="teams">
              <TeamLeaderboard
                students={students}
                onAssignTeam={assignTeam}
              />
            </TabsContent>

            <TabsContent value="mvp">
              <WeeklyMVP
                students={students}
                testResults={testResults}
                tests={weeklyTests}
              />
            </TabsContent>

            <TabsContent value="live-competition">
              <LiveCompetition
                students={students}
                onAwardXP={awardXP}
              />
            </TabsContent>

            <TabsContent value="smartboard">
              <SmartboardView
                students={students}
                tests={weeklyTests}
                testResults={testResults}
              />
            </TabsContent>

            <TabsContent value="announcements">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Announcements</h2>
                {announcements.length === 0 ? (
                  <p className="text-muted-foreground">No announcements yet.</p>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 bg-white rounded-lg shadow">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <p className="text-muted-foreground">{announcement.body}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {new Date(announcement.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <TestResultsView
                tests={weeklyTests}
                testResults={testResults}
                students={students}
              />
            </TabsContent>
          </SmartboardNavigation>
        </div>
      </div>
    </PresentationModeProvider>
  );
};

export default Index;


import { useState } from "react";
import { Challenge, StudentChallenge, Student } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Target, Users, Plus } from "lucide-react";
import { CreateChallengeDialog } from "./CreateChallengeDialog";

interface ChallengesManagerProps {
  challenges: Challenge[];
  studentChallenges: StudentChallenge[];
  students: Student[];
  onAddChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt'>) => void;
  onCompleteChallenge: (studentId: string, challengeId: string) => void;
}

export function ChallengesManager({ 
  challenges, 
  studentChallenges, 
  students, 
  onAddChallenge,
  onCompleteChallenge 
}: ChallengesManagerProps) {
  const getActiveChallenges = () => {
    const today = new Date().toISOString().split('T')[0];
    return challenges.filter(challenge => 
      challenge.isActive && 
      challenge.startDate <= today && 
      (!challenge.endDate || challenge.endDate >= today)
    );
  };

  const getChallengeStats = (challengeId: string) => {
    const completions = studentChallenges.filter(sc => sc.challengeId === challengeId);
    return {
      completed: completions.length,
      total: students.length,
      percentage: students.length > 0 ? Math.round((completions.length / students.length) * 100) : 0
    };
  };

  const isStudentChallengeCompleted = (studentId: string, challengeId: string) => {
    return studentChallenges.some(sc => 
      sc.studentId === studentId && sc.challengeId === challengeId
    );
  };

  const activeChallenges = getActiveChallenges();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Challenges</h2>
          <p className="text-muted-foreground">Motivate students with daily and weekly challenges</p>
        </div>
        <CreateChallengeDialog onAddChallenge={onAddChallenge} />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            All Challenges
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeChallenges.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active challenges</h3>
                <p className="text-muted-foreground mb-4">Create your first challenge to motivate students</p>
                <CreateChallengeDialog onAddChallenge={onAddChallenge} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeChallenges.map((challenge) => {
                const stats = getChallengeStats(challenge.id);
                return (
                  <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <p className="text-muted-foreground mt-2">{challenge.description}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              +{challenge.xpReward} XP
                            </Badge>
                            <Badge variant="outline">{challenge.type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(challenge.startDate).toLocaleDateString()} - {challenge.endDate ? new Date(challenge.endDate).toLocaleDateString() : 'Ongoing'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {stats.percentage}%
                          </div>
                          <div className="text-sm text-muted-foreground">completion</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-semibold">{stats.completed}</span> of <span className="font-semibold">{stats.total}</span> students completed
                        </div>
                        <div className="flex gap-2">
                          {students.slice(0, 3).map(student => {
                            const isCompleted = isStudentChallengeCompleted(student.id, challenge.id);
                            return (
                              <Button
                                key={student.id}
                                variant={isCompleted ? "default" : "outline"}
                                size="sm"
                                onClick={() => !isCompleted && onCompleteChallenge(student.id, challenge.id)}
                                disabled={isCompleted}
                              >
                                {isCompleted ? "✓" : "Mark"} {student.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-4">
            {challenges.map((challenge) => {
              const stats = getChallengeStats(challenge.id);
              return (
                <Card key={challenge.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <p className="text-muted-foreground mt-2">{challenge.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            +{challenge.xpReward} XP
                          </Badge>
                          <Badge variant="outline">{challenge.type}</Badge>
                          <Badge variant={challenge.isActive ? "default" : "secondary"}>
                            {challenge.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {stats.completed}/{stats.total}
                        </div>
                        <div className="text-sm text-muted-foreground">completed</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students
                  .map(student => ({
                    ...student,
                    challengesCompleted: studentChallenges.filter(sc => sc.studentId === student.id).length
                  }))
                  .sort((a, b) => b.challengesCompleted - a.challengesCompleted)
                  .map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.class} Grade</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{student.challengesCompleted}</p>
                        <p className="text-sm text-muted-foreground">challenges</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

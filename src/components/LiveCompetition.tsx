
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartboardButton } from '@/components/ui/smartboard-button';
import { Badge } from '@/components/ui/badge';
import { Student, TeamName } from '@/types';
import { Trophy, Timer, Star, Zap, Target } from 'lucide-react';
import { usePresentationMode } from './PresentationMode';
import { cn } from '@/lib/utils';

interface LiveCompetitionProps {
  students: Student[];
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

type CompetitionType = 'quiz' | 'team-battle' | 'quick-fire' | 'knowledge-race';

interface Competition {
  id: string;
  type: CompetitionType;
  title: string;
  description: string;
  duration: number;
  maxPoints: number;
  icon: React.ReactNode;
}

const competitions: Competition[] = [
  {
    id: 'quiz',
    type: 'quiz',
    title: 'Quick Quiz',
    description: 'Fast-paced Q&A session',
    duration: 300, // 5 minutes
    maxPoints: 50,
    icon: <Target className="h-6 w-6" />
  },
  {
    id: 'team-battle',
    type: 'team-battle',
    title: 'Team Battle',
    description: 'Teams compete for points',
    duration: 600, // 10 minutes
    maxPoints: 100,
    icon: <Trophy className="h-6 w-6" />
  },
  {
    id: 'quick-fire',
    type: 'quick-fire',
    title: 'Quick Fire',
    description: 'Rapid response round',
    duration: 120, // 2 minutes
    maxPoints: 30,
    icon: <Zap className="h-6 w-6" />
  },
  {
    id: 'knowledge-race',
    type: 'knowledge-race',
    title: 'Knowledge Race',
    description: 'First to answer wins',
    duration: 180, // 3 minutes
    maxPoints: 25,
    icon: <Star className="h-6 w-6" />
  }
];

export function LiveCompetition({ students, onAwardXP }: LiveCompetitionProps) {
  const { isPresentationMode, textSize } = usePresentationMode();
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Timer effect
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isActive, timeRemaining]);

  const startCompetition = (competition: Competition) => {
    setActiveCompetition(competition);
    setTimeRemaining(competition.duration);
    setIsActive(true);
    setSelectedStudents([]);
  };

  const endCompetition = () => {
    setIsActive(false);
    setActiveCompetition(null);
    setTimeRemaining(0);
    setSelectedStudents([]);
  };

  const awardPoints = (studentId: string, points: number) => {
    if (!activeCompetition) return;
    onAwardXP(studentId, points, `Live Competition: ${activeCompetition.title}`);
    setSelectedStudents(prev => [...prev, studentId]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const teamScores = students.reduce((acc, student) => {
    if (student.team) {
      acc[student.team] = (acc[student.team] || 0) + student.totalXp;
    }
    return acc;
  }, {} as Record<TeamName, number>);

  return (
    <div className={cn(
      "space-y-6",
      isPresentationMode && "p-8",
      textSize === 'large' && "text-lg",
      textSize === 'extra-large' && "text-xl"
    )}>
      {!activeCompetition ? (
        <div>
          <div className="text-center mb-8">
            <h2 className={cn(
              "font-bold font-display text-primary mb-4",
              textSize === 'normal' && "text-3xl",
              textSize === 'large' && "text-4xl",
              textSize === 'extra-large' && "text-5xl"
            )}>
              🏆 Live Competitions 🏆
            </h2>
            <p className="text-muted-foreground">Start a live competition to engage your students</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {competitions.map((competition) => (
              <Card key={competition.id} className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {competition.icon}
                    {competition.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{competition.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {Math.floor(competition.duration / 60)} min
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {competition.maxPoints} XP
                    </Badge>
                  </div>
                  <SmartboardButton 
                    onClick={() => startCompetition(competition)}
                    className="w-full"
                    size={isPresentationMode ? "lg" : "default"}
                  >
                    Start Competition
                  </SmartboardButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Active Competition Header */}
          <Card className="mb-6 border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {activeCompetition.icon}
                  <div>
                    <CardTitle className={cn(
                      textSize === 'normal' && "text-2xl",
                      textSize === 'large' && "text-3xl",
                      textSize === 'extra-large' && "text-4xl"
                    )}>
                      {activeCompetition.title}
                    </CardTitle>
                    <p className="text-muted-foreground">{activeCompetition.description}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className={cn(
                    "font-bold font-mono text-primary",
                    textSize === 'normal' && "text-3xl",
                    textSize === 'large' && "text-4xl", 
                    textSize === 'extra-large' && "text-5xl",
                    timeRemaining < 30 && "text-red-500 animate-pulse"
                  )}>
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-sm text-muted-foreground">Time Remaining</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Competition Controls */}
          <div className="flex gap-4 mb-6">
            <SmartboardButton 
              variant="destructive" 
              onClick={endCompetition}
              size={isPresentationMode ? "lg" : "default"}
            >
              End Competition
            </SmartboardButton>
            <SmartboardButton 
              variant="outline" 
              onClick={() => setIsActive(!isActive)}
              size={isPresentationMode ? "lg" : "default"}
            >
              {isActive ? 'Pause' : 'Resume'}
            </SmartboardButton>
          </div>

          {/* Student Selection for Points */}
          <div className="grid gap-4">
            <h3 className={cn(
              "font-semibold text-primary",
              textSize === 'normal' && "text-xl",
              textSize === 'large' && "text-2xl",
              textSize === 'extra-large' && "text-3xl"
            )}>
              Award Points to Students
            </h3>
            <div className="grid gap-3">
              {students.map((student) => {
                const hasAwarded = selectedStudents.includes(student.id);
                return (
                  <Card key={student.id} className={cn(
                    "p-4 transition-all",
                    hasAwarded && "bg-green-50 border-green-200"
                  )}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary",
                          textSize === 'large' && "w-14 h-14 text-lg",
                          textSize === 'extra-large' && "w-16 h-16 text-xl"
                        )}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className={cn(
                            "font-semibold",
                            textSize === 'large' && "text-lg",
                            textSize === 'extra-large' && "text-xl"
                          )}>
                            {student.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{student.class} Grade</p>
                          {student.team && (
                            <Badge variant="outline" className="mt-1">{student.team} Team</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[10, 25, 50].map((points) => (
                          <SmartboardButton
                            key={points}
                            variant={hasAwarded ? "outline" : "success"}
                            size={isPresentationMode ? "lg" : "sm"}
                            onClick={() => awardPoints(student.id, points)}
                            disabled={hasAwarded}
                          >
                            +{points}
                          </SmartboardButton>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartboardButton } from '@/components/ui/smartboard-button';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/types';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw, PlayCircle, Timer, Trophy } from 'lucide-react';
import { usePresentationMode } from './PresentationMode';
import { cn } from '@/lib/utils';

interface InteractiveMiniGamesProps {
  students: Student[];
  onAwardXP: (studentId: string, amount: number, reason: string) => void;
}

type GameType = 'wheel' | 'dice' | 'quick-poll' | 'rapid-fire';

const challenges = [
  "Name 3 capital cities",
  "Solve: 15 × 8 = ?",
  "What is the largest planet?",
  "Spell 'necessary'",
  "Name 5 animals that start with 'B'",
  "What year did WWII end?",
  "Define 'photosynthesis'",
  "Name 3 Shakespeare plays",
  "What is 25% of 200?",
  "Name the 7 continents",
];

export function InteractiveMiniGames({ students, onAwardXP }: InteractiveMiniGamesProps) {
  const { isPresentationMode, textSize } = usePresentationMode();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState('');
  const [diceValue, setDiceValue] = useState<number>(1);
  const [pollResults, setPollResults] = useState<Record<string, number>>({});
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTimerActive, timer]);

  const spinWheel = () => {
    if (students.length === 0) return;
    
    setIsSpinning(true);
    setSelectedStudent(null);
    
    setTimeout(() => {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
      setSelectedStudent(randomStudent);
      setCurrentChallenge(randomChallenge);
      setIsSpinning(false);
    }, 2000);
  };

  const rollDice = () => {
    setIsSpinning(true);
    let rolls = 0;
    const rollInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls++;
      if (rolls > 10) {
        clearInterval(rollInterval);
        setIsSpinning(false);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        
        // Award points based on dice value
        if (selectedStudent) {
          onAwardXP(selectedStudent.id, finalValue * 5, `Dice Roll: ${finalValue}`);
        }
      }
    }, 100);
  };

  const startQuickPoll = () => {
    setActiveGame('quick-poll');
    setPollResults({ A: 0, B: 0, C: 0, D: 0 });
  };

  const startRapidFire = () => {
    setActiveGame('rapid-fire');
    setTimer(60); // 1 minute
    setIsTimerActive(true);
  };

  const DiceIcon = ({ value }: { value: number }) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
    const Icon = icons[value - 1];
    return <Icon className="h-12 w-12" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>🎲 Lucky Dice</CardTitle>
          <SmartboardButton variant="outline" onClick={() => setActiveGame(null)}>
            Back to Games
          </SmartboardButton>
        </div>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="mx-auto w-48 h-48 border-4 border-primary rounded-3xl flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
          <DiceIcon value={diceValue} />
        </div>

        <div className="space-y-4">
          <div className="grid gap-4">
            <h3 className="text-xl font-semibold">Select a student first:</h3>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {students.map((student) => (
                <SmartboardButton
                  key={student.id}
                  variant={selectedStudent?.id === student.id ? "default" : "outline"}
                  onClick={() => setSelectedStudent(student)}
                  className="justify-start"
                >
                  {student.name} - {student.class} Grade
                </SmartboardButton>
              ))}
            </div>
          </div>

          <SmartboardButton 
            onClick={rollDice}
            disabled={isSpinning || !selectedStudent}
            size="xl"
            className="flex items-center gap-3"
          >
            <Dice1 className="h-6 w-6" />
            {isSpinning ? "Rolling..." : "Roll Dice!"}
          </SmartboardButton>

          {selectedStudent && (
            <p className="text-lg text-muted-foreground">
              Rolling for: <span className="font-semibold text-primary">{selectedStudent.name}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

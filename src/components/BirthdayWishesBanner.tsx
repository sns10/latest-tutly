import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Cake, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sparkles,
  Calendar,
  ImageIcon
} from 'lucide-react';
import { Student } from '@/types';
import { useBirthdayStudents, BirthdayStudent } from '@/hooks/useBirthdayStudents';
import { BirthdayWhatsAppDialog } from './BirthdayWhatsAppDialog';
import { BirthdayCardGenerator } from './BirthdayCardGenerator';

interface BirthdayWishesBannerProps {
  students: Student[];
  tuitionName: string;
  tuitionLogo?: string | null;
}

export function BirthdayWishesBanner({ 
  students, 
  tuitionName,
  tuitionLogo 
}: BirthdayWishesBannerProps) {
  const { todaysBirthdays, upcomingBirthdays, hasBirthdays, hasUpcoming } = useBirthdayStudents(students);
  const [dismissed, setDismissed] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BirthdayStudent | null>(null);
  const [cardStudent, setCardStudent] = useState<BirthdayStudent | null>(null);

  if (dismissed || (!hasBirthdays && !hasUpcoming)) return null;

  return (
    <>
      <Card className="relative overflow-hidden bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-pink-200 shadow-lg">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 h-32 w-32 bg-pink-200/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 bg-purple-200/30 rounded-full blur-2xl" />
        </div>

        <CardContent className="relative p-4 sm:p-6">
          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Today's Birthdays */}
          {hasBirthdays && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg">
                  <Cake className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Today's Birthdays
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {todaysBirthdays.length} student{todaysBirthdays.length > 1 ? 's' : ''} celebrating today!
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:gap-3">
                {todaysBirthdays.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-white/70 backdrop-blur rounded-xl border border-pink-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-pink-300 ring-offset-2">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Class {student.class}</span>
                          {student.age && (
                            <Badge variant="secondary" className="bg-pink-100 text-pink-700 text-xs">
                              Turning {student.age}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCardStudent(student)}
                        className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 h-8 px-2 text-xs"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Card</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                        className="gap-1.5 bg-green-600 hover:bg-green-700 h-8 px-2 text-xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Wishes</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Birthdays */}
          {hasUpcoming && (
            <Collapsible open={showUpcoming} onOpenChange={setShowUpcoming}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-between text-muted-foreground hover:text-foreground ${hasBirthdays ? 'mt-4' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Upcoming Birthdays ({upcomingBirthdays.length} this week)</span>
                  </div>
                  {showUpcoming ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {upcomingBirthdays.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2 bg-white/50 rounded-lg border border-purple-100"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Class {student.class} • In {student.daysUntilBirthday} day{student.daysUntilBirthday > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                      {new Date(student.dateOfBirth!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Dialog */}
      <BirthdayWhatsAppDialog
        student={selectedStudent}
        tuitionName={tuitionName}
        onClose={() => setSelectedStudent(null)}
      />

      {/* Birthday Card Generator */}
      <BirthdayCardGenerator
        student={cardStudent}
        tuitionName={tuitionName}
        tuitionLogo={tuitionLogo}
        onClose={() => setCardStudent(null)}
      />
    </>
  );
}

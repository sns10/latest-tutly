import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TuitionBranding } from '@/components/TuitionBranding';
import { Search, GraduationCap, LogOut } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  class: string;
  avatar: string | null;
  division?: { name: string } | null;
}

interface StudentPortalSelectorProps {
  students: Student[];
  tuitionName: string;
  tuitionLogo?: string | null;
  onSelectStudent: (student: Student) => void;
  onSignOut: () => void;
}

export function StudentPortalSelector({ 
  students, 
  tuitionName,
  tuitionLogo, 
  onSelectStudent, 
  onSignOut 
}: StudentPortalSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  // Group students by class
  const studentsByClass = filteredStudents.reduce((acc, student) => {
    const className = student.class;
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Sort classes
  const sortedClasses = Object.keys(studentsByClass).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <TuitionBranding 
            name={tuitionName} 
            logoUrl={tuitionLogo}
            showPoweredBy={false}
            size="sm"
          />
          <Button variant="outline" size="sm" onClick={onSignOut} className="gap-2 flex-shrink-0">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Select Your Name
            </CardTitle>
            <CardDescription>
              Find and select your name to view your academic dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Student List */}
            <ScrollArea className="h-[400px] pr-2">
              {sortedClasses.length > 0 ? (
                <div className="space-y-4">
                  {sortedClasses.map(className => (
                    <div key={className}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-white py-1">
                        Class {className}
                      </h3>
                      <div className="space-y-2">
                        {studentsByClass[className]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(student => (
                            <button
                              key={student.id}
                              onClick={() => onSelectStudent(student)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={student.avatar || undefined} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-600">
                                  {student.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {student.name}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {student.class}
                                  </Badge>
                                  {student.division?.name && (
                                    <Badge variant="secondary" className="text-xs">
                                      {student.division.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'No students found matching your search' : 'No students available'}
                </div>
              )}
            </ScrollArea>

            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-indigo-600">Upskillr Tutly</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
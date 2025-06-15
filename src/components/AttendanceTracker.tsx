import React, { useState } from 'react';
import { Student, StudentAttendance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Users, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: StudentAttendance[];
  onMarkAttendance: (studentId: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => void;
}

export function AttendanceTracker({ students, attendance, onMarkAttendance }: AttendanceTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const selectedDateStr = formatDate(selectedDate);

  // Filter students by class
  const filteredStudents = selectedClass === 'All' 
    ? students 
    : students.filter(s => s.class === selectedClass);

  // Get attendance for selected date
  const getAttendanceForStudent = (studentId: string) => {
    return attendance.find(a => a.studentId === studentId && a.date === selectedDateStr);
  };

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    const totalStudents = filteredStudents.length;
    const dateAttendance = attendance.filter(a => a.date === selectedDateStr);
    const present = dateAttendance.filter(a => a.status === 'present').length;
    const absent = dateAttendance.filter(a => a.status === 'absent').length;
    const late = dateAttendance.filter(a => a.status === 'late').length;
    const excused = dateAttendance.filter(a => a.status === 'excused').length;

    return { totalStudents, present, absent, late, excused };
  };

  const stats = getAttendanceStats();

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused', notes?: string) => {
    onMarkAttendance(studentId, selectedDateStr, status, notes);
    toast.success('Attendance updated successfully');
  };

  const handleBulkAttendance = () => {
    filteredStudents.forEach(student => {
      const existingAttendance = getAttendanceForStudent(student.id);
      if (!existingAttendance) {
        handleMarkAttendance(student.id, bulkStatus);
      }
    });
    toast.success(`Bulk attendance marked as ${bulkStatus}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Attendance Tracker</h2>
          <p className="text-muted-foreground">Track and manage student attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar and Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            
            <div className="space-y-2">
              <Label>Filter by Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  <SelectItem value="8th">8th Grade</SelectItem>
                  <SelectItem value="9th">9th Grade</SelectItem>
                  <SelectItem value="10th">10th Grade</SelectItem>
                  <SelectItem value="11th">11th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bulk Mark As</Label>
              <Select value={bulkStatus} onValueChange={(value: any) => setBulkStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAttendance} className="w-full" size="sm">
                Mark All Unmarked
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Stats and List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{stats.present}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold">{stats.absent}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{stats.late}</div>
                <div className="text-sm text-muted-foreground">Late</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{stats.excused}</div>
                <div className="text-sm text-muted-foreground">Excused</div>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Attendance for {selectedDate.toLocaleDateString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredStudents.map((student) => {
                  const studentAttendance = getAttendanceForStudent(student.id);
                  return (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">Class: {student.class}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant={studentAttendance?.status === 'present' ? 'default' : 'outline'}
                            onClick={() => handleMarkAttendance(student.id, 'present')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={studentAttendance?.status === 'absent' ? 'destructive' : 'outline'}
                            onClick={() => handleMarkAttendance(student.id, 'absent')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={studentAttendance?.status === 'late' ? 'secondary' : 'outline'}
                            onClick={() => handleMarkAttendance(student.id, 'late')}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className={cn(studentAttendance?.status === 'excused' && 'bg-blue-100 text-blue-800')}
                            onClick={() => handleMarkAttendance(student.id, 'excused')}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { Subject, Faculty } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Search, BookOpen, UserCircle } from 'lucide-react';

interface AttendanceControlsProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  selectedSubject: string;
  onSubjectChange: (value: string) => void;
  selectedFaculty: string;
  onFacultyChange: (value: string) => void;
  availableSubjects: Subject[];
  availableFaculty: Faculty[];
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bulkStatus: 'present' | 'absent' | 'late' | 'excused';
  onBulkStatusChange: (value: 'present' | 'absent' | 'late' | 'excused') => void;
  onBulkMark: () => void;
}

export function AttendanceControls({
  selectedDate,
  onDateChange,
  selectedClass,
  onClassChange,
  selectedSubject,
  onSubjectChange,
  selectedFaculty,
  onFacultyChange,
  availableSubjects,
  availableFaculty,
  searchQuery,
  onSearchChange,
  bulkStatus,
  onBulkStatusChange,
  onBulkMark
}: AttendanceControlsProps) {
  return (
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
          onSelect={(date) => date && onDateChange(date)}
          className="rounded-md border"
        />
        
        <div className="space-y-2">
          <Label>Filter by Class</Label>
          <Select value={selectedClass} onValueChange={onClassChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Classes</SelectItem>
              <SelectItem value="8th">8th Grade</SelectItem>
              <SelectItem value="9th">9th Grade</SelectItem>
              <SelectItem value="10th">10th Grade</SelectItem>
              <SelectItem value="11th">11th Grade</SelectItem>
              <SelectItem value="12th">12th Grade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Subject (Optional)
          </Label>
          <Select value={selectedSubject} onValueChange={onSubjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {availableSubjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Faculty (Optional)
          </Label>
          <Select value={selectedFaculty} onValueChange={onFacultyChange}>
            <SelectTrigger>
              <SelectValue placeholder="All faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All faculty</SelectItem>
              {availableFaculty.map(fac => (
                <SelectItem key={fac.id} value={fac.id}>
                  {fac.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-student">Search Student</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-student"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={onSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bulk Mark As</Label>
          <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
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
          <Button onClick={onBulkMark} className="w-full" size="sm">
            Mark All Unmarked
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

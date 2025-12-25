import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Timetable, Faculty, Subject, Room, ClassName, Division } from '@/types';
import { RoomManager } from './RoomManager';
import { WeeklyTimetable } from './WeeklyTimetable';
import { ScheduleClassDialog } from './ScheduleClassDialog';
import { SpecialClassesList } from './SpecialClassesList';
import { RoomOccupancyVisualizer } from './RoomOccupancyVisualizer';
import { TimelineView } from './TimelineView';
import { TomorrowSchedule } from './TomorrowSchedule';
import { Calendar, Clock, DoorOpen, CalendarPlus, LayoutGrid, CalendarDays } from 'lucide-react';
import { useTuitionFeatures } from '@/hooks/useTuitionFeatures';

interface SchedulingModuleProps {
  timetable: Timetable[];
  faculty: Faculty[];
  subjects: Subject[];
  rooms: Room[];
  divisions: Division[];
  onAddEntry: (
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    eventType?: string,
    notes?: string,
    divisionId?: string
  ) => Promise<void>;
  onUpdateEntry: (
    id: string,
    classValue: ClassName,
    subjectId: string,
    facultyId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    type: 'regular' | 'special',
    roomId?: string,
    roomNumber?: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string,
    divisionId?: string
  ) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onAddRoom: (name: string, capacity?: number, description?: string) => Promise<void>;
  onUpdateRoom: (id: string, name: string, capacity?: number, description?: string) => Promise<void>;
  onDeleteRoom: (id: string) => Promise<void>;
}

export function SchedulingModule({
  timetable,
  faculty,
  subjects,
  rooms,
  divisions,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
}: SchedulingModuleProps) {
  const { isFeatureEnabled } = useTuitionFeatures();
  const [activeTab, setActiveTab] = useState('tomorrow');
  const [editingEntry, setEditingEntry] = useState<Timetable | null>(null);

  const handleEditEntry = (entry: Timetable) => {
    setEditingEntry(entry);
    // For special classes, switch to special tab
    if (entry.type === 'special') {
      setActiveTab('special');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Class Scheduling</h1>
          <p className="text-muted-foreground text-sm">Manage timetables, rooms, and special classes</p>
        </div>
        <ScheduleClassDialog
          timetable={timetable}
          faculty={faculty}
          subjects={subjects}
          rooms={rooms}
          divisions={divisions}
          onScheduleClass={onAddEntry}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap">
          <TabsTrigger value="tomorrow" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CalendarDays className="h-4 w-4 mr-2 hidden sm:inline" />
            Tomorrow
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Clock className="h-4 w-4 mr-2 hidden sm:inline" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="special" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CalendarPlus className="h-4 w-4 mr-2 hidden sm:inline" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Calendar className="h-4 w-4 mr-2 hidden sm:inline" />
            Timeline
          </TabsTrigger>
          {isFeatureEnabled('scheduling') && (
            <TabsTrigger value="rooms" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <DoorOpen className="h-4 w-4 mr-2 hidden sm:inline" />
              Rooms
            </TabsTrigger>
          )}
          {isFeatureEnabled('scheduling') && (
            <TabsTrigger value="availability" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <LayoutGrid className="h-4 w-4 mr-2 hidden sm:inline" />
              Availability
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tomorrow's Schedule */}
        <TabsContent value="tomorrow" className="mt-4">
          <TomorrowSchedule
            timetable={timetable}
            faculty={faculty}
            subjects={subjects}
            rooms={rooms}
            divisions={divisions}
            onAddEntry={onAddEntry}
            onUpdateEntry={onUpdateEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </TabsContent>

        {/* Weekly Timetable */}
        <TabsContent value="weekly" className="mt-4">
          <WeeklyTimetable
            timetable={timetable}
            faculty={faculty}
            subjects={subjects}
            rooms={rooms}
            divisions={divisions}
            onAddEntry={onAddEntry}
            onUpdateEntry={onUpdateEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </TabsContent>

        {/* Special/Scheduled Classes */}
        <TabsContent value="special" className="mt-4">
          <SpecialClassesList
            timetable={timetable}
            rooms={rooms}
            onEditEntry={handleEditEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </TabsContent>

        {/* Timeline/Calendar View */}
        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            timetable={timetable}
            rooms={rooms}
            onEditEntry={handleEditEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </TabsContent>

        {/* Room Management - Feature Gated */}
        {isFeatureEnabled('scheduling') && (
          <TabsContent value="rooms" className="mt-4">
            <RoomManager
              rooms={rooms}
              timetable={timetable}
              onAddRoom={onAddRoom}
              onUpdateRoom={onUpdateRoom}
              onDeleteRoom={onDeleteRoom}
            />
          </TabsContent>
        )}

        {/* Room Availability - Feature Gated */}
        {isFeatureEnabled('scheduling') && (
          <TabsContent value="availability" className="mt-4">
            <RoomOccupancyVisualizer
              rooms={rooms}
              timetable={timetable}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

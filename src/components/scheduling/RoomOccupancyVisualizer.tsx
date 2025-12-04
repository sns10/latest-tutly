import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Room, Timetable } from '@/types';
import { DoorOpen, DoorClosed, Clock } from 'lucide-react';

interface RoomOccupancyVisualizerProps {
  rooms: Room[];
  timetable: Timetable[];
}

// Generate time slots from 7 AM to 10 PM
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export function RoomOccupancyVisualizer({ rooms, timetable }: RoomOccupancyVisualizerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');

  const selectedDay = new Date(selectedDate).getDay();

  // Get occupancy data for each room on the selected date
  const roomOccupancy = useMemo(() => {
    const occupancy: Record<string, { time: string; endTime: string; subject?: string; class?: string }[]> = {};

    rooms.forEach((room) => {
      occupancy[room.id] = [];
    });

    timetable.forEach((entry) => {
      if (!entry.roomId) return;

      // Check special classes for selected date
      if (entry.type === 'special' && entry.specificDate === selectedDate) {
        occupancy[entry.roomId]?.push({
          time: entry.startTime,
          endTime: entry.endTime,
          subject: entry.subject?.name,
          class: entry.class,
        });
        return;
      }

      // Check regular classes for day of week
      if (entry.type === 'regular' && entry.dayOfWeek === selectedDay) {
        // Check if there's no override for this specific date
        const hasOverride = timetable.some(
          (t) =>
            t.type === 'special' &&
            t.specificDate === selectedDate &&
            t.roomId === entry.roomId &&
            t.startTime < entry.endTime &&
            t.endTime > entry.startTime
        );

        if (!hasOverride) {
          occupancy[entry.roomId]?.push({
            time: entry.startTime,
            endTime: entry.endTime,
            subject: entry.subject?.name,
            class: entry.class,
          });
        }
      }
    });

    return occupancy;
  }, [rooms, timetable, selectedDate, selectedDay]);

  // Check if room is free during selected time range
  const isRoomFreeInRange = (roomId: string): boolean => {
    if (!selectedStartTime || !selectedEndTime) return true;

    const roomSlots = roomOccupancy[roomId] || [];
    return !roomSlots.some(
      (slot) => selectedStartTime < slot.endTime && selectedEndTime > slot.time
    );
  };

  // Check if time slot overlaps with any occupancy
  const isSlotOccupied = (roomId: string, slotTime: string): { occupied: boolean; info?: { subject?: string; class?: string } } => {
    const roomSlots = roomOccupancy[roomId] || [];
    const slotEnd = `${(parseInt(slotTime) + 1).toString().padStart(2, '0')}:00`;

    for (const slot of roomSlots) {
      if (slotTime < slot.endTime && slotEnd > slot.time) {
        return { occupied: true, info: { subject: slot.subject, class: slot.class } };
      }
    }
    return { occupied: false };
  };

  // Filter rooms based on time selection
  const filteredRooms = useMemo(() => {
    if (!selectedStartTime || !selectedEndTime) return rooms;
    return rooms.filter((room) => isRoomFreeInRange(room.id));
  }, [rooms, selectedStartTime, selectedEndTime, roomOccupancy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label>Start Time (optional)</Label>
              <Input
                type="time"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                className="bg-white"
              />
            </div>
            <div>
              <Label>End Time (optional)</Label>
              <Input
                type="time"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
          {selectedStartTime && selectedEndTime && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {filteredRooms.length} rooms free
              </Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {rooms.length - filteredRooms.length} rooms occupied
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid View */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Room Availability Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rooms.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <DoorOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No rooms added yet</p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Time Headers */}
                <div className="flex border-b border-slate-200 sticky top-0 bg-slate-50">
                  <div className="w-32 flex-shrink-0 p-2 font-medium text-sm text-muted-foreground border-r border-slate-200">
                    Room
                  </div>
                  {TIME_SLOTS.map((time) => (
                    <div
                      key={time}
                      className="w-16 flex-shrink-0 p-2 text-center text-xs text-muted-foreground border-r border-slate-100"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Room Rows */}
                {rooms.map((room) => {
                  const isFreeInRange = isRoomFreeInRange(room.id);
                  return (
                    <div
                      key={room.id}
                      className={`flex border-b border-slate-100 ${
                        selectedStartTime && selectedEndTime
                          ? isFreeInRange
                            ? 'bg-green-50/50'
                            : 'bg-red-50/50'
                          : ''
                      }`}
                    >
                      <div className="w-32 flex-shrink-0 p-2 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          {isFreeInRange ? (
                            <DoorOpen className="h-4 w-4 text-green-600" />
                          ) : (
                            <DoorClosed className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium truncate">{room.name}</span>
                        </div>
                        {room.capacity && (
                          <span className="text-xs text-muted-foreground">{room.capacity} seats</span>
                        )}
                      </div>
                      {TIME_SLOTS.map((time) => {
                        const { occupied, info } = isSlotOccupied(room.id, time);
                        return (
                          <div
                            key={time}
                            className={`w-16 flex-shrink-0 p-1 border-r border-slate-100 ${
                              occupied ? 'bg-red-200' : 'bg-green-100'
                            }`}
                            title={
                              occupied
                                ? `${info?.class || ''} - ${info?.subject || 'Occupied'}`
                                : 'Available'
                            }
                          >
                            {occupied && (
                              <div className="text-xs text-red-800 truncate">{info?.subject?.slice(0, 5)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Simple List View */}
      {selectedStartTime && selectedEndTime && (
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Available Rooms ({selectedStartTime} - {selectedEndTime})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredRooms.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No rooms available at this time</p>
              ) : (
                filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <DoorOpen className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{room.name}</p>
                        {room.description && (
                          <p className="text-sm text-muted-foreground">{room.description}</p>
                        )}
                      </div>
                    </div>
                    {room.capacity && (
                      <Badge variant="secondary">{room.capacity} seats</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

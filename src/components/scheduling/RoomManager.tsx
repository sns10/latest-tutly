import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, DoorOpen, DoorClosed } from 'lucide-react';
import { toast } from 'sonner';
import { Room, Timetable } from '@/types';

interface RoomManagerProps {
  rooms: Room[];
  timetable: Timetable[];
  onAddRoom: (name: string, capacity?: number, description?: string) => Promise<void>;
  onUpdateRoom: (id: string, name: string, capacity?: number, description?: string) => Promise<void>;
  onDeleteRoom: (id: string) => Promise<void>;
}

export function RoomManager({
  rooms,
  timetable,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
}: RoomManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ name: '', capacity: '', description: '' });
    setEditingRoom(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    const capacity = formData.capacity ? parseInt(formData.capacity) : undefined;

    if (editingRoom) {
      await onUpdateRoom(editingRoom.id, formData.name, capacity, formData.description);
    } else {
      await onAddRoom(formData.name, capacity, formData.description);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity?.toString() || '',
      description: room.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      await onDeleteRoom(id);
    }
  };

  // Check if a room is currently occupied
  const isRoomOccupied = (roomId: string): boolean => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    const today = now.toISOString().split('T')[0];

    return timetable.some((entry) => {
      const matchesRoom = entry.roomId === roomId;
      if (!matchesRoom) return false;

      // Check special classes for today
      if (entry.type === 'special' && entry.specificDate === today) {
        return entry.startTime <= currentTime && entry.endTime > currentTime;
      }

      // Check regular weekly schedule
      if (entry.type === 'regular' && entry.dayOfWeek === currentDay) {
        return entry.startTime <= currentTime && entry.endTime > currentTime;
      }

      return false;
    });
  };

  // Get next class for a room
  const getNextClass = (roomId: string): { time: string; subject?: string } | null => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();
    const today = now.toISOString().split('T')[0];

    const upcomingClasses = timetable.filter((entry) => {
      if (entry.roomId !== roomId) return false;

      // Check special classes for today
      if (entry.type === 'special' && entry.specificDate === today) {
        return entry.startTime > currentTime;
      }

      // Check regular weekly schedule
      if (entry.type === 'regular' && entry.dayOfWeek === currentDay) {
        return entry.startTime > currentTime;
      }

      return false;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (upcomingClasses.length > 0) {
      return {
        time: upcomingClasses[0].startTime,
        subject: upcomingClasses[0].subject?.name,
      };
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Room Management</h2>
          <p className="text-sm text-muted-foreground">Manage classrooms and view availability</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Room 101, Lab A"
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity (optional)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g., 30"
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Science lab with projector"
                  className="bg-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingRoom ? 'Update' : 'Add'} Room
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Room List */}
      {rooms.length === 0 ? (
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="py-8 text-center text-muted-foreground">
            <DoorOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No rooms added yet</p>
            <p className="text-sm">Add rooms to start scheduling</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const occupied = isRoomOccupied(room.id);
            const nextClass = getNextClass(room.id);

            return (
              <Card key={room.id} className="bg-white shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${occupied ? 'bg-red-100' : 'bg-green-100'}`}>
                        {occupied ? (
                          <DoorClosed className={`h-5 w-5 ${occupied ? 'text-red-600' : 'text-green-600'}`} />
                        ) : (
                          <DoorOpen className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{room.name}</h3>
                        <span className={`text-xs font-medium ${occupied ? 'text-red-600' : 'text-green-600'}`}>
                          {occupied ? 'Occupied' : 'Available'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(room)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(room.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {room.capacity && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span>Capacity: {room.capacity}</span>
                    </div>
                  )}

                  {room.description && (
                    <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                  )}

                  {nextClass && (
                    <div className="text-xs bg-slate-100 rounded-md px-2 py-1 mt-2">
                      Next: {nextClass.time} {nextClass.subject && `- ${nextClass.subject}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

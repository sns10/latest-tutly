
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Announcement } from "@/types";
import { Plus } from "lucide-react";

interface CreateAnnouncementDialogProps {
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => void;
}

export function CreateAnnouncementDialog({ onAddAnnouncement }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    targetClass: "",
    xpBonus: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onAddAnnouncement({
      title: formData.title,
      body: formData.body,
      createdBy: null, // Will be set by auth system later
      targetClass: formData.targetClass || null,
      xpBonus: formData.xpBonus || null,
    });

    setFormData({
      title: "",
      body: "",
      targetClass: "",
      xpBonus: 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Announcement Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Science Fair Next Week!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Write your announcement message here..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetClass">Target Class (Optional)</Label>
              <Select
                value={formData.targetClass}
                onValueChange={(value) => setFormData(prev => ({ ...prev, targetClass: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  <SelectItem value="8th">8th Grade</SelectItem>
                  <SelectItem value="9th">9th Grade</SelectItem>
                  <SelectItem value="10th">10th Grade</SelectItem>
                  <SelectItem value="11th">11th Grade</SelectItem>
                  <SelectItem value="12th">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xpBonus">XP Bonus (Optional)</Label>
              <Input
                id="xpBonus"
                type="number"
                value={formData.xpBonus || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, xpBonus: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                min="0"
                max="50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Announcement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

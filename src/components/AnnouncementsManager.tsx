
import { useState } from "react";
import { Announcement } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus } from "lucide-react";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";

interface AnnouncementsManagerProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishedAt'>) => void;
}

export function AnnouncementsManager({ 
  announcements, 
  onAddAnnouncement 
}: AnnouncementsManagerProps) {

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-primary">Announcements</h2>
          <p className="text-muted-foreground">Share important news and updates with students</p>
        </div>
        <CreateAnnouncementDialog onAddAnnouncement={onAddAnnouncement} />
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
            <p className="text-muted-foreground mb-4">Create your first announcement to share news with students</p>
            <CreateAnnouncementDialog onAddAnnouncement={onAddAnnouncement} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      {announcement.targetClass && (
                        <Badge variant="outline" className="bg-blue-50">
                          {announcement.targetClass === "All" ? "All Classes" : `${announcement.targetClass} Grade`}
                        </Badge>
                      )}
                      {announcement.xpBonus && announcement.xpBonus > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          +{announcement.xpBonus} XP Bonus
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(announcement.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{announcement.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

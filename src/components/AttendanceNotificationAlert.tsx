import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Clock, BookOpen, Users, User, Smartphone, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PendingAttendanceClass {
  timetableId: string;
  className: string;
  subjectName: string;
  facultyName: string;
  endTime: string;
  subjectId: string;
  facultyId: string;
  date: string;
}

interface AttendanceNotificationAlertProps {
  pendingClass: PendingAttendanceClass | null;
  onDismiss: () => void;
  onIgnore?: () => void; // New prop for "Already Taken" action
}

export function AttendanceNotificationAlert({
  pendingClass,
  onDismiss,
  onIgnore,
}: AttendanceNotificationAlertProps) {
  const navigate = useNavigate();
  const { isSupported, isSubscribed, subscribe, isLoading: pushLoading } = usePushNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Show dialog when pendingClass is set
  useEffect(() => {
    if (pendingClass) {
      setDialogOpen(true);
    }
  }, [pendingClass]);

  // Request notification permission and show browser notification
  useEffect(() => {
    if (!pendingClass) return;

    const formatTimeLocal = (timeStr: string) => {
      try {
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return format(date, 'h:mm a');
      } catch {
        return timeStr;
      }
    };

    const showBrowserNotification = async () => {
      // Never allow notification logic to crash the app.
      try {
        if (!('Notification' in window)) return;

        // Request permission if not already granted
        if (Notification.permission === 'default') {
          try {
            await Notification.requestPermission();
          } catch {
            // ignore
          }
        }

        if (Notification.permission !== 'granted') return;

        const title = '⏰ Attendance Reminder';
        const options: NotificationOptions = {
          body: `${pendingClass.className} - ${pendingClass.subjectName}\nEnds at: ${formatTimeLocal(pendingClass.endTime)}\nPlease mark attendance now!`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `attendance-${pendingClass.timetableId}-${pendingClass.date}`,
          requireInteraction: true,
          data: { url: '/attendance' },
        };

        // ✅ Preferred: show via Service Worker registration
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration?.showNotification) {
              await registration.showNotification(title, options);
              return;
            }
          }
        } catch {
          // fall back below
        }

        // Fallback: constructor (some environments throw "Illegal constructor")
        try {
          const notification = new Notification(title, options);
          notification.onclick = () => {
            try {
              window.focus();
              navigate('/attendance');
              handleClose();
            } finally {
              notification.close();
            }
          };
        } catch (err) {
          console.warn('Browser notification unavailable:', err);
        }
      } catch (err) {
        console.warn('Notification failed:', err);
      }
    };

    void showBrowserNotification();
  }, [pendingClass, navigate]);

  // Show push notification prompt after dismissing in-app alert a few times
  useEffect(() => {
    if (pendingClass && isSupported && !isSubscribed) {
      // Check if user has dismissed the in-app alert multiple times
      const dismissCount = parseInt(localStorage.getItem('attendanceAlertDismissCount') || '0');
      if (dismissCount >= 2) {
        setShowPushPrompt(true);
      }
    }
  }, [pendingClass, isSupported, isSubscribed]);

  const handleEnablePush = async () => {
    await subscribe();
    setShowPushPrompt(false);
  };

  const handleClose = () => {
    setDialogOpen(false);
    const dismissCount = parseInt(localStorage.getItem('attendanceAlertDismissCount') || '0');
    localStorage.setItem('attendanceAlertDismissCount', String(dismissCount + 1));
    onDismiss();
  };

  const handleIgnore = () => {
    setDialogOpen(false);
    if (onIgnore) {
      onIgnore();
    } else {
      onDismiss();
    }
  };

  if (!pendingClass) return null;

  const handleTakeAttendance = () => {
    setDialogOpen(false);
    navigate('/attendance');
    onDismiss();
  };

  // Format time
  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-[90vw] sm:max-w-md mx-auto bg-orange-50 border-orange-400 p-0 overflow-hidden">
        <div className="bg-orange-500 px-4 py-3 flex items-center gap-3">
          <Bell className="h-6 w-6 text-white animate-bounce" />
          <DialogHeader className="flex-1 space-y-0">
            <DialogTitle className="text-white font-bold text-lg">
              ⏰ Attendance Reminder
            </DialogTitle>
            <DialogDescription className="text-orange-100 text-sm">
              Class ending soon - Please mark attendance!
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4">
          {/* Class Details */}
          <div className="bg-white rounded-lg p-3 space-y-2 border border-orange-200">
            <div className="flex items-center gap-2 text-orange-900">
              <Users className="h-4 w-4 text-orange-600" />
              <span className="font-semibold">Class:</span>
              <span>{pendingClass.className}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-900">
              <BookOpen className="h-4 w-4 text-orange-600" />
              <span className="font-semibold">Subject:</span>
              <span>{pendingClass.subjectName}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-900">
              <User className="h-4 w-4 text-orange-600" />
              <span className="font-semibold">Faculty:</span>
              <span>{pendingClass.facultyName}</span>
            </div>
            <div className="flex items-center gap-2 text-orange-900">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-semibold">Ends at:</span>
              <span className="font-bold text-orange-700">{formatTime(pendingClass.endTime)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleTakeAttendance}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-semibold"
            >
              <Bell className="h-5 w-5 mr-2" />
              Take Attendance Now
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={handleIgnore}
                variant="outline"
                className="flex-1 border-green-500 text-green-700 hover:bg-green-50 h-10"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Already Taken
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-100 h-10"
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>

          {/* Push notification prompt */}
          {showPushPrompt && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Get reminders even when the app is closed!
              </p>
              <Button
                onClick={handleEnablePush}
                size="sm"
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                disabled={pushLoading}
              >
                <Bell className="h-4 w-4 mr-2" />
                {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


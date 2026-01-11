import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X, Clock, BookOpen, Users, User, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
}

export function AttendanceNotificationAlert({
  pendingClass,
  onDismiss,
}: AttendanceNotificationAlertProps) {
  const navigate = useNavigate();
  const { isSupported, isSubscribed, subscribe, isLoading: pushLoading } = usePushNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  // Request notification permission and show browser notification
  useEffect(() => {
    if (!pendingClass) return;

    // Request permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // User denied permission, continue with in-app notification
      });
    }

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
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

      const notification = new Notification('⏰ Attendance Reminder', {
        body: `${pendingClass.className} - ${pendingClass.subjectName}\nEnds at: ${formatTime(pendingClass.endTime)}\nPlease mark attendance now!`,
        icon: '/favicon.ico',
        tag: `attendance-${pendingClass.timetableId}-${pendingClass.date}`,
        requireInteraction: true,
        badge: '/favicon.ico',
      });

      notification.onclick = () => {
        window.focus();
        navigate('/attendance');
        onDismiss();
        notification.close();
      };

      // Close notification after 5 minutes or when dismissed
      const timer = setTimeout(() => {
        notification.close();
      }, 5 * 60 * 1000);

      return () => {
        clearTimeout(timer);
        notification.close();
      };
    }
  }, [pendingClass, navigate, onDismiss]);

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

  const handleDismiss = () => {
    const dismissCount = parseInt(localStorage.getItem('attendanceAlertDismissCount') || '0');
    localStorage.setItem('attendanceAlertDismissCount', String(dismissCount + 1));
    onDismiss();
  };

  if (!pendingClass) return null;

  const handleTakeAttendance = () => {
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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-5 duration-300">
      <Alert className="border-orange-500 bg-orange-50 shadow-2xl ring-2 ring-orange-300 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Bell className="h-5 w-5 text-orange-600 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <AlertTitle className="text-orange-900 font-bold text-base mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance Reminder
            </AlertTitle>
            <AlertDescription className="text-orange-800 space-y-2">
              <p className="font-semibold">
                Class ending in 10 minutes - Attendance not marked!
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">Class: {pendingClass.className}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="font-medium">Subject: {pendingClass.subjectName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">Faculty: {pendingClass.facultyName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">Ends at: {formatTime(pendingClass.endTime)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleTakeAttendance}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  size="sm"
                >
                  Take Attendance
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Push notification prompt */}
              {showPushPrompt && (
                <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-xs text-blue-800 mb-2">
                    <Smartphone className="h-3 w-3 inline mr-1" />
                    Get reminders even when the app is closed!
                  </p>
                  <Button
                    onClick={handleEnablePush}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                    disabled={pushLoading}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
                  </Button>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}


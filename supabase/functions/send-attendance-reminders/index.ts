import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push library for Deno
async function sendWebPush(subscription: any, payload: any, vapidKeys: any) {
  const encoder = new TextEncoder();
  
  // Create JWT for VAPID
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: new URL(subscription.endpoint).origin,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: 'mailto:admin@tutly.app',
  };

  // For now, we'll use a simple fetch with the subscription endpoint
  // In production, you'd use proper web-push with VAPID signing
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: JSON.stringify(payload),
  });

  return response;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const today = now.toISOString().split('T')[0];

    // Calculate time window: classes ending in 5-15 minutes
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
    const endTimeStart = fiveMinutesLater.toTimeString().slice(0, 5);
    const endTimeEnd = fifteenMinutesLater.toTimeString().slice(0, 5);

    console.log(`Checking for classes ending between ${endTimeStart} and ${endTimeEnd} on day ${currentDay}`);

    // Get classes ending in 5-15 minutes
    const { data: pendingClasses, error: classError } = await supabase
      .from('timetable')
      .select(`
        id,
        class,
        day_of_week,
        start_time,
        end_time,
        tuition_id,
        division_id,
        subject_id,
        subjects!inner (name),
        faculty!inner (name),
        divisions (name)
      `)
      .eq('day_of_week', currentDay)
      .gte('end_time', endTimeStart)
      .lte('end_time', endTimeEnd);

    if (classError) {
      console.error('Error fetching classes:', classError);
      throw classError;
    }

    console.log(`Found ${pendingClasses?.length || 0} classes ending soon`);

    if (!pendingClasses || pendingClasses.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No classes ending soon', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationsSent: any[] = [];

    for (const cls of pendingClasses) {
      // Check if attendance is already marked for this class today
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('date', today)
        .eq('subject_id', cls.subject_id)
        .limit(1);

      if (existingAttendance && existingAttendance.length > 0) {
        console.log(`Attendance already marked for class ${cls.id}`);
        continue;
      }

      // Get push subscriptions for users in this tuition
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('tuition_id', cls.tuition_id);

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
        continue;
      }

      console.log(`Found ${subscriptions?.length || 0} subscriptions for tuition ${cls.tuition_id}`);

      // Send notification to each subscription
      for (const sub of subscriptions || []) {
        // Handle joined data properly - Supabase returns arrays for joins
        const subjectName = Array.isArray(cls.subjects) ? cls.subjects[0]?.name : (cls.subjects as any)?.name;
        const divisionName = Array.isArray(cls.divisions) ? cls.divisions[0]?.name : (cls.divisions as any)?.name;
        
        const payload = {
          title: '⏰ Attendance Reminder',
          body: `${cls.class}${divisionName ? ` - ${divisionName}` : ''} • ${subjectName || 'Class'} ends at ${cls.end_time}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `attendance-${cls.id}-${today}`,
          data: {
            url: '/attendance',
            classId: cls.id,
            subjectId: cls.subject_id,
            date: today,
          },
        };

        try {
          // Note: In production, you'd use proper web-push with VAPID
          // For now, we're storing the notification intent
          console.log(`Would send notification to ${sub.endpoint}:`, payload);
          
          notificationsSent.push({
            subscriptionId: sub.id,
            classId: cls.id,
            payload,
          });
        } catch (pushError) {
          console.error('Error sending push:', pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Attendance reminders processed',
        classesChecked: pendingClasses.length,
        notificationsPrepared: notificationsSent.length,
        notifications: notificationsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-attendance-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

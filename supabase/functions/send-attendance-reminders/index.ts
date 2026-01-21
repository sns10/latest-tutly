import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Web Push using standard fetch with VAPID JWT
// Note: For full web-push support, the client-side must handle the encryption
// This implementation sends a simpler notification that modern browsers can handle

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Create a simple VAPID JWT for authorization
async function createVapidJwt(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: 'mailto:admin@tutly.app',
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  try {
    // Decode the private key (in raw format, 32 bytes for P-256)
    const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
    
    // Create a JWK from the raw private key bytes
    // P-256 private key is 32 bytes, we need to construct the JWK
    const publicKeyBytes = base64UrlDecode(vapidPublicKey);
    
    // For EC P-256, we need x and y from the public key (65 bytes uncompressed: 04 || x || y)
    // Skip the first byte (0x04) and split the rest into x (32 bytes) and y (32 bytes)
    const x = publicKeyBytes.slice(1, 33);
    const y = publicKeyBytes.slice(33, 65);
    
    const jwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(x),
      y: base64UrlEncode(y),
      d: base64UrlEncode(privateKeyBytes),
    };

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert signature from IEEE P1363 format (64 bytes) to what JWT expects
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error('Error creating VAPID JWT:', error);
    throw error;
  }
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
    const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY');

    if (!vapidPrivateKey || !vapidPublicKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time
    const now = new Date();
    const currentDay = now.getDay();
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
        faculty_id,
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
    const errors: any[] = [];

    for (const cls of pendingClasses) {
      // Check if attendance is already marked for this class today
      const { data: existingAttendance } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('date', today)
        .eq('subject_id', cls.subject_id)
        .eq('faculty_id', cls.faculty_id)
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

      for (const sub of subscriptions || []) {
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
          const audience = new URL(sub.endpoint).origin;
          const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);

          // Send push notification
          // Note: For proper encrypted push, the payload needs to be encrypted
          // This uses a simplified approach that works with some push services
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
              'Content-Type': 'application/json',
              'TTL': '86400',
              'Urgency': 'high',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok || response.status === 201) {
            notificationsSent.push({
              subscriptionId: sub.id,
              classId: cls.id,
              status: 'sent',
            });
            console.log(`Successfully sent notification to ${sub.endpoint}`);
          } else {
            const errorText = await response.text();
            console.error(`Failed to send push to ${sub.endpoint}: ${response.status} - ${errorText}`);
            
            // If subscription is invalid (410 Gone), remove it
            if (response.status === 410 || response.status === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
              console.log(`Removed invalid subscription ${sub.id}`);
            }
            
            errors.push({
              subscriptionId: sub.id,
              status: response.status,
              error: errorText,
            });
          }
        } catch (pushError) {
          console.error('Error sending push:', pushError);
          errors.push({
            subscriptionId: sub.id,
            error: String(pushError),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Attendance reminders processed',
        classesChecked: pendingClasses.length,
        notificationsSent: notificationsSent.length,
        errors: errors.length,
        details: { sent: notificationsSent, errors },
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

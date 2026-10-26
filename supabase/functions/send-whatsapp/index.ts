import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendTemplateBatch, SendError } from '../_shared/whatsappSend.ts';

const Item = z.object({
  student_id: z.string().uuid(),
  amount: z.string().max(32).optional(),
  due_date: z.string().max(40).optional(),
  subject: z.string().max(80).optional(),
  date: z.string().max(40).optional(),
  marks: z.string().max(16).optional(),
  total: z.string().max(16).optional(),
});

const Body = z.object({
  template: z.enum(['fee_reminder_v1', 'test_result_v1', 'absence_alert_v1']),
  messages: z.array(Item).min(1).max(200),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { template, messages } = parsed.data;

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
    const isAdmin = (roles ?? []).some((r) => r.role === 'tuition_admin' || r.role === 'super_admin');
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const studentIds = [...new Set(messages.map((m) => m.student_id))];
    const { data: students, error: stErr } = await admin
      .from('students').select('id, tuition_id').in('id', studentIds);
    if (stErr) throw stErr;
    if (!students || students.length !== studentIds.length) return json({ error: 'Student not found' }, 404);
    const tuitionIds = new Set(students.map((s) => s.tuition_id));
    if (tuitionIds.size !== 1) return json({ error: 'Students must belong to one center' }, 400);
    const tuitionId = students[0].tuition_id;

    const isSuper = (roles ?? []).some((r) => r.role === 'super_admin');
    if (!isSuper) {
      const { data: profile } = await admin.from('profiles').select('tuition_id').eq('id', userId).maybeSingle();
      if (profile?.tuition_id !== tuitionId) return json({ error: 'Forbidden' }, 403);
    }

    const result = await sendTemplateBatch(admin, { tuitionId, template, messages, sentBy: userId });
    return json(result);
  } catch (e) {
    if (e instanceof SendError) return json({ error: e.message }, e.status);
    console.error('send-whatsapp error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

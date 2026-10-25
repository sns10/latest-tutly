import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/whatsapp';

const Item = z.object({
  student_id: z.string().uuid(),
  // Template-specific fields (center name is always filled server-side)
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

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

const clean = (s: string | undefined | null) =>
  (s ?? '').replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim() || '-';

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

    // Must be a tuition admin; resolve their tuition
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
    const isAdmin = (roles ?? []).some((r) => r.role === 'tuition_admin' || r.role === 'super_admin');
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const studentIds = [...new Set(messages.map((m) => m.student_id))];
    const { data: students, error: stErr } = await admin
      .from('students')
      .select('id, name, class, tuition_id, father_phone, mother_phone, parent_phone')
      .in('id', studentIds);
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

    const [{ data: tuition }, { data: settings }] = await Promise.all([
      admin.from('tuitions').select('name').eq('id', tuitionId).maybeSingle(),
      admin.from('tuition_whatsapp_settings').select('is_enabled, sender_secret_name').eq('tuition_id', tuitionId).maybeSingle(),
    ]);
    if (!settings?.is_enabled) {
      return json({ error: 'Automated WhatsApp is not enabled for this center' }, 403);
    }

    // Direct Meta Cloud API (preferred when configured), else Lovable connector gateway
    const META_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN');
    const META_PHONE_ID = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    const META_WABA_ID = Deno.env.get('META_WHATSAPP_WABA_ID');
    let headers: Record<string, string>;
    let messagesUrl: string;
    let templatesUrl: string;
    if (META_TOKEN && META_PHONE_ID && META_WABA_ID) {
      const base = 'https://graph.facebook.com/v21.0';
      headers = { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' };
      messagesUrl = `${base}/${META_PHONE_ID}/messages`;
      templatesUrl = `${base}/${META_WABA_ID}/message_templates?name=${template}&fields=name,status,language`;
    } else {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const secretName = settings.sender_secret_name || 'WHATSAPP_API_KEY';
      if (!/^WHATSAPP_API_KEY(_\d+)?$/.test(secretName)) return json({ error: 'Invalid sender configuration' }, 500);
      const WHATSAPP_API_KEY = Deno.env.get(secretName);
      if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) {
        return json({ error: 'WhatsApp sender is not connected yet' }, 503);
      }
      headers = {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': WHATSAPP_API_KEY,
        'Content-Type': 'application/json',
      };
      messagesUrl = `${GATEWAY_URL}/messages`;
      templatesUrl = `${GATEWAY_URL}/message_templates?name=${template}&fields=name,status,language`;
    }

    // Look up the approved template's language code
    let language = 'en';
    const tplRes = await fetch(templatesUrl, { headers });
    const tplText = await tplRes.text();
    if (!tplRes.ok) {
      console.error(`Template lookup failed [${tplRes.status}]: ${tplText}`);
      return json({ error: 'Could not read WhatsApp templates', status: tplRes.status, details: tplText }, 502);
    }
    const tpl = (JSON.parse(tplText).data ?? []).find((t: any) => t.name === template);
    if (!tpl) return json({ error: `Template ${template} not found on WhatsApp account` }, 400);
    if (tpl.status !== 'APPROVED') return json({ error: `Template ${template} is ${tpl.status}, not approved yet` }, 400);
    language = tpl.language || language;

    const centerName = clean(tuition?.name);
    const byId = new Map(students.map((s) => [s.id, s]));
    const results: { student_id: string; ok: boolean; error?: string }[] = [];
    const logs: any[] = [];

    for (const [idx, m] of messages.entries()) {
      if (idx > 0) await new Promise((r) => setTimeout(r, 100));
      const s = byId.get(m.student_id)!;
      const to = normalizePhone(s.father_phone) || normalizePhone(s.mother_phone) || normalizePhone(s.parent_phone);
      if (!to) {
        results.push({ student_id: s.id, ok: false, error: 'No valid parent phone' });
        continue;
      }

      let params: string[];
      if (template === 'fee_reminder_v1') {
        params = [centerName, clean(m.amount), clean(`${s.name} (Class ${s.class})`), clean(m.due_date)];
      } else if (template === 'test_result_v1') {
        params = [centerName, clean(s.name), clean(m.subject), clean(m.date), clean(m.marks), clean(m.total)];
      } else {
        params = [clean(s.name), clean(m.date), clean(m.subject), centerName];
      }

      const res = await fetch(messagesUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template,
            language: { code: language },
            components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
          },
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`WhatsApp send failed [${res.status}]: ${text}`);
        let msg = `Send failed (${res.status})`;
        try { msg = JSON.parse(text)?.error?.message || msg; } catch { /* keep */ }
        results.push({ student_id: s.id, ok: false, error: msg });
        logs.push({ tuition_id: tuitionId, student_id: s.id, template_name: template, recipient: to, status: 'failed', error_message: msg.slice(0, 500), sent_by: userId });
      } else {
        let messageId: string | null = null;
        try { messageId = JSON.parse(text)?.messages?.[0]?.id ?? null; } catch { /* ignore */ }
        results.push({ student_id: s.id, ok: true });
        logs.push({ tuition_id: tuitionId, student_id: s.id, template_name: template, recipient: to, status: 'sent', message_id: messageId, sent_by: userId });
      }
    }

    if (logs.length) {
      const { error: logErr } = await admin.from('whatsapp_logs').insert(logs);
      if (logErr) console.error('Log insert failed', logErr);
    }

    const sent = results.filter((r) => r.ok).length;
    return json({ sent, failed: results.length - sent, results });
  } catch (e) {
    console.error('send-whatsapp error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

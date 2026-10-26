// Shared WhatsApp template sender used by send-whatsapp (instant) and
// dispatch-scheduled-whatsapp (daily scheduled batches).
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/whatsapp';

export type Template = 'fee_reminder_v1' | 'test_result_v1' | 'absence_alert_v1';

export interface SendItem {
  student_id: string;
  amount?: string;
  due_date?: string;
  subject?: string;
  date?: string;
  marks?: string;
  total?: string;
}

export interface SendResult {
  sent: number;
  failed: number;
  results: { student_id: string; ok: boolean; error?: string }[];
}

export class SendError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

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

/** Sends one template to many students of a single center. Caller must have authorised access. */
export async function sendTemplateBatch(
  admin: any,
  opts: { tuitionId: string; template: Template; messages: SendItem[]; sentBy: string | null },
): Promise<SendResult> {
  const { tuitionId, template, messages, sentBy } = opts;
  const studentIds = [...new Set(messages.map((m) => m.student_id))];
  const { data: students, error: stErr } = await admin
    .from('students')
    .select('id, name, class, tuition_id, father_phone, mother_phone, parent_phone')
    .in('id', studentIds);
  if (stErr) throw stErr;
  const byId = new Map<string, any>((students ?? []).filter((s: any) => s.tuition_id === tuitionId).map((s: any) => [s.id, s]));

  const [{ data: tuition }, { data: settings }] = await Promise.all([
    admin.from('tuitions').select('name').eq('id', tuitionId).maybeSingle(),
    admin.from('tuition_whatsapp_settings').select('is_enabled, sender_secret_name').eq('tuition_id', tuitionId).maybeSingle(),
  ]);
  if (!settings?.is_enabled) throw new SendError('Automated WhatsApp is not enabled for this center', 403);

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
    if (!/^WHATSAPP_API_KEY(_\d+)?$/.test(secretName)) throw new SendError('Invalid sender configuration', 500);
    const WHATSAPP_API_KEY = Deno.env.get(secretName);
    if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) throw new SendError('WhatsApp sender is not connected yet', 503);
    headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': WHATSAPP_API_KEY,
      'Content-Type': 'application/json',
    };
    messagesUrl = `${GATEWAY_URL}/messages`;
    templatesUrl = `${GATEWAY_URL}/message_templates?name=${template}&fields=name,status,language`;
  }

  const tplRes = await fetch(templatesUrl, { headers });
  const tplText = await tplRes.text();
  if (!tplRes.ok) {
    console.error(`Template lookup failed [${tplRes.status}]: ${tplText}`);
    throw new SendError(`Could not read WhatsApp templates (${tplRes.status})`, 502);
  }
  const tpl = (JSON.parse(tplText).data ?? []).find((t: any) => t.name === template);
  if (!tpl) throw new SendError(`Template ${template} not found on WhatsApp account`);
  if (tpl.status !== 'APPROVED') throw new SendError(`Template ${template} is ${tpl.status}, not approved yet`);
  const language = tpl.language || 'en';

  const centerName = clean(tuition?.name);
  const results: SendResult['results'] = [];
  const logs: any[] = [];

  for (const [idx, m] of messages.entries()) {
    if (idx > 0) await new Promise((r) => setTimeout(r, 100));
    const s = byId.get(m.student_id);
    if (!s) { results.push({ student_id: m.student_id, ok: false, error: 'Student not found' }); continue; }
    const to = normalizePhone(s.father_phone) || normalizePhone(s.mother_phone) || normalizePhone(s.parent_phone);
    if (!to) { results.push({ student_id: s.id, ok: false, error: 'No valid parent phone' }); continue; }

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
      logs.push({ tuition_id: tuitionId, student_id: s.id, template_name: template, recipient: to, status: 'failed', delivery_status: 'failed', failed_at: new Date().toISOString(), error_message: msg.slice(0, 500), sent_by: sentBy });
    } else {
      let messageId: string | null = null;
      try { messageId = JSON.parse(text)?.messages?.[0]?.id ?? null; } catch { /* ignore */ }
      results.push({ student_id: s.id, ok: true });
      logs.push({ tuition_id: tuitionId, student_id: s.id, template_name: template, recipient: to, status: 'sent', message_id: messageId, sent_by: sentBy });
    }
  }

  if (logs.length) {
    const { error: logErr } = await admin.from('whatsapp_logs').insert(logs);
    if (logErr) console.error('Log insert failed', logErr);
  }
  const sent = results.filter((r) => r.ok).length;
  return { sent, failed: results.length - sent, results };
}

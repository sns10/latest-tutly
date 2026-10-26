import { createClient } from 'npm:@supabase/supabase-js@2';

const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3 };

async function validSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const token = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
    if (token && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === token) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appSecret || !(await validSignature(raw, req.headers.get('X-Hub-Signature-256'), appSecret))) {
    console.error('Invalid webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  // Collapse all events per message id into the single strongest state (failed wins).
  const byId = new Map<string, { st: string; at: string; err?: any; delivered_at?: string; read_at?: string }>();
  for (const entry of payload?.entry ?? []) for (const ch of entry?.changes ?? []) for (const s of ch?.value?.statuses ?? []) {
    const id = typeof s?.id === 'string' ? s.id.slice(0, 200) : null;
    const st = String(s?.status ?? '');
    if (!id || !['sent', 'delivered', 'read', 'failed'].includes(st)) continue;
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString();
    const cur = byId.get(id) ?? { st: 'sent', at };
    if (st === 'delivered') cur.delivered_at = at;
    if (st === 'read') cur.read_at = at;
    if (st === 'failed') { cur.st = 'failed'; cur.at = at; cur.err = s.errors?.[0] ?? {}; }
    else if (cur.st !== 'failed' && (RANK[st] ?? 0) > (RANK[cur.st] ?? 0)) { cur.st = st; cur.at = at; }
    byId.set(id, cur);
  }
  if (!byId.size) return new Response('ok', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows, error: selErr } = await admin.from('whatsapp_logs')
    .select('id, message_id, delivery_status').in('message_id', [...byId.keys()]);
  if (selErr) { console.error('Lookup failed', selErr); return new Response('error', { status: 500 }); }

  const now = new Date().toISOString();
  await Promise.all((rows ?? []).map((row) => {
    const ev = byId.get(row.message_id)!;
    const patch: Record<string, unknown> = { status_updated_at: now };
    if (ev.delivered_at) patch.delivered_at = ev.delivered_at;
    if (ev.read_at) patch.read_at = ev.read_at;
    if (ev.st === 'failed') {
      const e = ev.err ?? {};
      const reason = [e.title, e.error_data?.details || e.message].filter(Boolean).join(' — ') || 'Failed';
      Object.assign(patch, { delivery_status: 'failed', failed_at: ev.at, status: 'failed', error_message: String(reason).slice(0, 500), error_code: e.code != null ? String(e.code) : null });
    } else if (row.delivery_status !== 'failed' && (RANK[ev.st] ?? 0) > (RANK[row.delivery_status] ?? 0)) {
      patch.delivery_status = ev.st;
    }
    return admin.from('whatsapp_logs').update(patch).eq('id', row.id)
      .then(({ error }) => { if (error) console.error('Update failed', error); });
  }));

  return new Response('ok', { status: 200 });
});

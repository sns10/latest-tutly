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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const statuses: any[] = [];
  for (const entry of payload?.entry ?? []) for (const ch of entry?.changes ?? []) for (const s of ch?.value?.statuses ?? []) statuses.push(s);

  for (const s of statuses) {
    const id = typeof s?.id === 'string' ? s.id.slice(0, 200) : null;
    const st = String(s?.status ?? '');
    if (!id || !['sent', 'delivered', 'read', 'failed'].includes(st)) continue;
    const at = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString();

    const { data: row } = await admin.from('whatsapp_logs').select('id, delivery_status').eq('message_id', id).maybeSingle();
    if (!row) continue;

    const patch: Record<string, unknown> = { status_updated_at: new Date().toISOString() };
    if (st === 'failed') {
      const e = s.errors?.[0] ?? {};
      const reason = [e.title, e.error_data?.details || e.message].filter(Boolean).join(' — ') || 'Failed';
      Object.assign(patch, { delivery_status: 'failed', failed_at: at, status: 'failed', error_message: String(reason).slice(0, 500), error_code: e.code != null ? String(e.code) : null });
    } else {
      if (st === 'delivered') patch.delivered_at = at;
      if (st === 'read') patch.read_at = at;
      const cur = row.delivery_status;
      if (cur !== 'failed' && (RANK[st] ?? 0) > (RANK[cur] ?? 0)) patch.delivery_status = st;
    }
    const { error } = await admin.from('whatsapp_logs').update(patch).eq('id', row.id);
    if (error) console.error('Update failed', error);
  }

  return new Response('ok', { status: 200 });
});

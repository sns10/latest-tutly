// Runs once a day (9:00 AM IST) and sends pending scheduled WhatsApp batches whose
// date has arrived. Large batches are sent in chunks; when work remains the function
// re-invokes itself in the background (no extra timer). Progress is saved after every
// chunk so a timed-out run resumes from where it stopped and never re-sends a student.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendTemplateBatch } from '../_shared/whatsappSend.ts';

const CHUNK = 100;              // recipients per send call
const RUN_BUDGET = 400;         // recipients per invocation (keeps well under the time limit)
const STALE_MINUTES = 30;
const MAX_CHAIN = 25;           // safety cap on self re-invocations

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function istNow() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { date, hour } = istNow();
    if (hour < 9) return json({ skipped: 'before 9 AM IST' });
    const body = await req.json().catch(() => ({}));
    const chain = Math.min(Number(body?.chain) || 0, MAX_CHAIN);

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Recover batches stuck in processing (crashed / timed-out run)
    const staleBefore = new Date(Date.now() - STALE_MINUTES * 60000).toISOString();
    await admin.from('whatsapp_scheduled_dispatches')
      .update({ status: 'pending', claimed_at: null })
      .eq('status', 'processing').lt('claimed_at', staleBefore);

    let budget = RUN_BUDGET;
    const summary: any[] = [];

    while (budget > 0) {
      const { data: next } = await admin.from('whatsapp_scheduled_dispatches')
        .select('id').eq('status', 'pending').lte('scheduled_date', date)
        .order('scheduled_date').order('created_at').limit(1).maybeSingle();
      if (!next) break;

      const { data: row } = await admin.from('whatsapp_scheduled_dispatches')
        .update({ status: 'processing', claimed_at: new Date().toISOString() })
        .eq('id', next.id).eq('status', 'pending')
        .select('id, tuition_id, template, messages, created_by, progress_offset, sent_count, failed_count')
        .maybeSingle();
      if (!row) continue;

      const all: any[] = row.messages ?? [];
      let offset = row.progress_offset ?? 0;
      let sent = row.sent_count ?? 0;
      let failed = row.failed_count ?? 0;
      try {
        while (offset < all.length && budget > 0) {
          const size = Math.min(CHUNK, budget, all.length - offset);
          const r = await sendTemplateBatch(admin, {
            tuitionId: row.tuition_id, template: row.template,
            messages: all.slice(offset, offset + size), sentBy: row.created_by,
          });
          offset += size; budget -= size; sent += r.sent; failed += r.failed;
          await admin.from('whatsapp_scheduled_dispatches').update({
            progress_offset: offset, sent_count: sent, failed_count: failed, claimed_at: new Date().toISOString(),
          }).eq('id', row.id);
        }
        const done = offset >= all.length;
        await admin.from('whatsapp_scheduled_dispatches').update(done
          ? { status: 'completed', dispatched_at: new Date().toISOString(), claimed_at: null }
          : { status: 'pending', claimed_at: null },
        ).eq('id', row.id);
        summary.push({ id: row.id, sent, failed, done });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error('Scheduled dispatch failed', row.id, msg);
        await admin.from('whatsapp_scheduled_dispatches').update({
          status: 'failed', error_message: msg.slice(0, 500), dispatched_at: new Date().toISOString(), claimed_at: null,
        }).eq('id', row.id);
        summary.push({ id: row.id, error: msg });
      }
    }

    // More work left? Wake ourselves once more in the background.
    if (budget <= 0 && chain < MAX_CHAIN) {
      const { count } = await admin.from('whatsapp_scheduled_dispatches')
        .select('id', { count: 'exact', head: true }).eq('status', 'pending').lte('scheduled_date', date);
      if ((count ?? 0) > 0) {
        const p = fetch(`${url}/functions/v1/dispatch-scheduled-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
          body: JSON.stringify({ chain: chain + 1 }),
        }).catch((e) => console.error('Re-invoke failed', e));
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p);
      }
    }
    return json({ processed: summary.length, summary });
  } catch (e) {
    console.error('dispatch-scheduled-whatsapp error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

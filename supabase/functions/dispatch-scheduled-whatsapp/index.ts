// Runs once a day (9:00 AM IST) and sends every pending scheduled WhatsApp batch
// whose date has arrived. Safe to call anytime: it does nothing before 9 AM IST
// and claims each batch atomically so nothing is sent twice.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendTemplateBatch } from '../_shared/whatsappSend.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function istNow() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { date, hour } = istNow();
    if (hour < 9) return json({ skipped: 'before 9 AM IST' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: due, error } = await admin
      .from('whatsapp_scheduled_dispatches')
      .select('id')
      .eq('status', 'pending')
      .lte('scheduled_date', date)
      .limit(50);
    if (error) throw error;

    const summary: any[] = [];
    for (const row of due ?? []) {
      // Atomic claim
      const { data: claimed } = await admin
        .from('whatsapp_scheduled_dispatches')
        .update({ status: 'processing' })
        .eq('id', row.id).eq('status', 'pending')
        .select('id, tuition_id, template, messages, created_by')
        .maybeSingle();
      if (!claimed) continue;
      try {
        const r = await sendTemplateBatch(admin, {
          tuitionId: claimed.tuition_id,
          template: claimed.template,
          messages: claimed.messages ?? [],
          sentBy: claimed.created_by,
        });
        await admin.from('whatsapp_scheduled_dispatches').update({
          status: 'completed', sent_count: r.sent, failed_count: r.failed, dispatched_at: new Date().toISOString(),
        }).eq('id', claimed.id);
        summary.push({ id: claimed.id, ...r, results: undefined });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error('Scheduled dispatch failed', claimed.id, msg);
        await admin.from('whatsapp_scheduled_dispatches').update({
          status: 'failed', error_message: msg.slice(0, 500), dispatched_at: new Date().toISOString(),
        }).eq('id', claimed.id);
        summary.push({ id: claimed.id, error: msg });
      }
    }
    return json({ processed: summary.length, summary });
  } catch (e) {
    console.error('dispatch-scheduled-whatsapp error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

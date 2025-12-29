import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 5 days from now
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 5);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Find tuitions expiring in 5 days
    const { data: expiringTuitions, error } = await supabase
      .from('tuitions')
      .select('id, name, email, subscription_end_date')
      .eq('is_active', true)
      .not('subscription_end_date', 'is', null)
      .lte('subscription_end_date', reminderDateStr + 'T23:59:59.999Z')
      .gte('subscription_end_date', new Date().toISOString());

    if (error) {
      console.error('Error fetching expiring tuitions:', error);
      throw error;
    }

    console.log(`Found ${expiringTuitions?.length || 0} tuitions expiring within 5 days`);

    const reminders = (expiringTuitions || []).map(t => {
      const endDate = new Date(t.subscription_end_date);
      const today = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        tuition_id: t.id,
        tuition_name: t.name,
        email: t.email,
        subscription_end_date: t.subscription_end_date,
        days_remaining: daysRemaining,
      };
    });

    // Log reminders for now - email sending can be added later with Resend
    if (reminders.length > 0) {
      console.log('Subscription reminders to send:', JSON.stringify(reminders, null, 2));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_count: reminders.length,
        reminders 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error checking subscription reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});

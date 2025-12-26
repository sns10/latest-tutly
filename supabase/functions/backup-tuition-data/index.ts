import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  tuitionId: string;
  action: 'export' | 'create' | 'list' | 'download';
  backupId?: string;
}

const MAX_BACKUPS_PER_TUITION = 2;
const BACKUP_RETENTION_DAYS = 60;

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, tuition_id')
      .eq('user_id', callerUser.id)
      .in('role', ['tuition_admin', 'super_admin']);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Rate limit check per user
    if (!checkRateLimit(callerUser.id)) {
      console.warn(`Rate limit exceeded for user: ${callerUser.id}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { tuitionId, action, backupId }: BackupRequest = await req.json();

    if (!tuitionId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const isSuperAdmin = roleData.some(r => r.role === 'super_admin');
    const hasTuitionAccess = roleData.some(r => r.tuition_id === tuitionId);

    if (!isSuperAdmin && !hasTuitionAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied for this tuition' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Helper function to fetch all tuition data
    const fetchTuitionData = async () => {
      const [
        studentsRes,
        attendanceRes,
        feesRes,
        testsRes,
        testResultsRes,
        subjectsRes,
        facultyRes,
        divisionsRes,
        homeworkRes,
        announcementsRes,
        timetableRes,
        roomsRes,
      ] = await Promise.all([
        supabaseAdmin.from('students').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('student_attendance').select('*, students!inner(tuition_id)').eq('students.tuition_id', tuitionId),
        supabaseAdmin.from('student_fees').select('*, students!inner(tuition_id)').eq('students.tuition_id', tuitionId),
        supabaseAdmin.from('weekly_tests').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('student_test_results').select('*, students!inner(tuition_id)').eq('students.tuition_id', tuitionId),
        supabaseAdmin.from('subjects').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('faculty').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('divisions').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('homework').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('announcements').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('timetable').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('rooms').select('*').eq('tuition_id', tuitionId),
      ]);

      return {
        metadata: {
          tuitionId,
          createdAt: new Date().toISOString(),
          version: '1.0',
        },
        data: {
          students: studentsRes.data || [],
          attendance: attendanceRes.data || [],
          fees: feesRes.data || [],
          tests: testsRes.data || [],
          testResults: testResultsRes.data || [],
          subjects: subjectsRes.data || [],
          faculty: facultyRes.data || [],
          divisions: divisionsRes.data || [],
          homework: homeworkRes.data || [],
          announcements: announcementsRes.data || [],
          timetable: timetableRes.data || [],
          rooms: roomsRes.data || [],
        },
        stats: {
          studentsCount: studentsRes.data?.length || 0,
          attendanceRecords: attendanceRes.data?.length || 0,
          feeRecords: feesRes.data?.length || 0,
          testsCount: testsRes.data?.length || 0,
          subjectsCount: subjectsRes.data?.length || 0,
          facultyCount: facultyRes.data?.length || 0,
        }
      };
    };

    // EXPORT: Instant download, no storage
    if (action === 'export') {
      console.log('Exporting data for tuition:', tuitionId);
      const backupData = await fetchTuitionData();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          backup: backupData,
          message: 'Data exported successfully'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // CREATE: Monthly snapshot with retention cleanup
    if (action === 'create') {
      console.log('Creating monthly snapshot for tuition:', tuitionId);
      
      // Clean up old backups (older than retention period)
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - BACKUP_RETENTION_DAYS);
      
      await supabaseAdmin
        .from('tuition_backups')
        .delete()
        .eq('tuition_id', tuitionId)
        .lt('created_at', retentionDate.toISOString());

      // Check existing backup count and delete oldest if exceeds limit
      const { data: existingBackups } = await supabaseAdmin
        .from('tuition_backups')
        .select('id, created_at')
        .eq('tuition_id', tuitionId)
        .order('created_at', { ascending: false });

      if (existingBackups && existingBackups.length >= MAX_BACKUPS_PER_TUITION) {
        const backupsToDelete = existingBackups.slice(MAX_BACKUPS_PER_TUITION - 1);
        for (const backup of backupsToDelete) {
          await supabaseAdmin
            .from('tuition_backups')
            .delete()
            .eq('id', backup.id);
        }
        console.log(`Deleted ${backupsToDelete.length} old backups to maintain limit`);
      }

      const backupData = await fetchTuitionData();

      const { data: backupRecord, error: insertError } = await supabaseAdmin
        .from('tuition_backups')
        .insert({
          tuition_id: tuitionId,
          created_by: callerUser.id,
          backup_data: backupData,
          file_size: JSON.stringify(backupData).length,
          status: 'completed'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to store backup:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create snapshot' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Monthly snapshot created:', backupRecord.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          backupId: backupRecord.id,
          stats: backupData.stats,
          message: 'Monthly snapshot created successfully'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'list') {
      const { data: backups, error: listError } = await supabaseAdmin
        .from('tuition_backups')
        .select('id, created_at, file_size, status, created_by')
        .eq('tuition_id', tuitionId)
        .order('created_at', { ascending: false })
        .limit(MAX_BACKUPS_PER_TUITION);

      if (listError) {
        return new Response(
          JSON.stringify({ success: true, backups: [] }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, backups }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'download' && backupId) {
      const { data: backup, error: fetchError } = await supabaseAdmin
        .from('tuition_backups')
        .select('backup_data')
        .eq('id', backupId)
        .eq('tuition_id', tuitionId)
        .single();

      if (fetchError || !backup) {
        return new Response(
          JSON.stringify({ error: 'Backup not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, backup: backup.backup_data }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in backup-tuition-data function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);

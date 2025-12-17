import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  tuitionId: string;
  action: 'create' | 'list' | 'download';
  backupId?: string;
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

    // Verify caller is authenticated
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

    // Verify the caller's JWT and role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if caller has tuition_admin or super_admin role
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

    const { tuitionId, action, backupId }: BackupRequest = await req.json();

    if (!tuitionId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify caller has permission for this tuition
    const isSuperAdmin = roleData.some(r => r.role === 'super_admin');
    const hasTuitionAccess = roleData.some(r => r.tuition_id === tuitionId);

    if (!isSuperAdmin && !hasTuitionAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied for this tuition' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (action === 'create') {
      console.log('Creating backup for tuition:', tuitionId);
      
      // Fetch all tuition data
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

      const backupData = {
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

      // Store backup record in database
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
        // Table might not exist yet, return the data directly
        console.log('Backup table not available, returning data directly');
        return new Response(
          JSON.stringify({ 
            success: true, 
            backup: backupData,
            message: 'Backup created successfully (in-memory)'
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Backup created successfully:', backupRecord.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          backupId: backupRecord.id,
          stats: backupData.stats,
          message: 'Backup created successfully'
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
        .limit(10);

      if (listError) {
        // Table might not exist
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

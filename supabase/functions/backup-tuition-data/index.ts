import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  tuitionId: string;
  action: 'export' | 'create' | 'list' | 'download' | 'restore';
  backupId?: string;
  backupData?: any; // For restore from file upload
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
    const { tuitionId, action, backupId, backupData: uploadedBackupData }: BackupRequest = await req.json();

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

    // Helper function to fetch all tuition data with pagination
    const fetchAllPages = async (table: string, query: any) => {
      const allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          break;
        }
        if (data && data.length > 0) {
          allData.push(...data);
          if (data.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }
      return allData;
    };

    const fetchTuitionData = async () => {
      // Fetch all data with pagination for large tables
      const [
        studentsRes,
        subjectsRes,
        facultyRes,
        divisionsRes,
        roomsRes,
        testsRes,
        homeworkRes,
        announcementsRes,
        classFeesRes,
        challengesRes,
        termExamsRes,
        termExamSubjectsRes,
      ] = await Promise.all([
        supabaseAdmin.from('students').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('subjects').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('faculty').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('divisions').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('rooms').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('weekly_tests').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('homework').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('announcements').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('class_fees').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('challenges').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('term_exams').select('*').eq('tuition_id', tuitionId),
        supabaseAdmin.from('term_exam_subjects').select('*, term_exams!inner(tuition_id)').eq('term_exams.tuition_id', tuitionId),
      ]);

      // Fetch large tables with pagination
      const studentIds = (studentsRes.data || []).map((s: any) => s.id);
      
      let attendance: any[] = [];
      let fees: any[] = [];
      let feePayments: any[] = [];
      let testResults: any[] = [];
      let studentXp: any[] = [];
      let studentBadges: any[] = [];
      let studentRewards: any[] = [];
      let studentChallenges: any[] = [];
      let termExamResults: any[] = [];
      let timetable: any[] = [];
      let facultySubjects: any[] = [];

      if (studentIds.length > 0) {
        // Batch fetch for student-related data
        const batchSize = 100;
        for (let i = 0; i < studentIds.length; i += batchSize) {
          const batchIds = studentIds.slice(i, i + batchSize);
          
          const [attRes, feesRes, testResRes, xpRes, badgesRes, rewardsRes, chalRes, termResRes] = await Promise.all([
            supabaseAdmin.from('student_attendance').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_fees').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_test_results').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_xp').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_badges').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_rewards').select('*').in('student_id', batchIds),
            supabaseAdmin.from('student_challenges').select('*').in('student_id', batchIds),
            supabaseAdmin.from('term_exam_results').select('*').in('student_id', batchIds),
          ]);

          attendance.push(...(attRes.data || []));
          fees.push(...(feesRes.data || []));
          testResults.push(...(testResRes.data || []));
          studentXp.push(...(xpRes.data || []));
          studentBadges.push(...(badgesRes.data || []));
          studentRewards.push(...(rewardsRes.data || []));
          studentChallenges.push(...(chalRes.data || []));
          termExamResults.push(...(termResRes.data || []));
        }

        // Fetch fee payments for all fees
        const feeIds = fees.map((f: any) => f.id);
        if (feeIds.length > 0) {
          for (let i = 0; i < feeIds.length; i += batchSize) {
            const batchFeeIds = feeIds.slice(i, i + batchSize);
            const { data } = await supabaseAdmin.from('fee_payments').select('*').in('fee_id', batchFeeIds);
            feePayments.push(...(data || []));
          }
        }
      }

      // Fetch timetable
      const timetableRes = await supabaseAdmin.from('timetable').select('*').eq('tuition_id', tuitionId);
      timetable = timetableRes.data || [];

      // Fetch faculty subjects
      const facultyIds = (facultyRes.data || []).map((f: any) => f.id);
      if (facultyIds.length > 0) {
        const { data } = await supabaseAdmin.from('faculty_subjects').select('*').in('faculty_id', facultyIds);
        facultySubjects = data || [];
      }

      return {
        metadata: {
          tuitionId,
          createdAt: new Date().toISOString(),
          version: '2.0',
        },
        data: {
          students: studentsRes.data || [],
          attendance,
          fees,
          feePayments,
          tests: testsRes.data || [],
          testResults,
          subjects: subjectsRes.data || [],
          faculty: facultyRes.data || [],
          facultySubjects,
          divisions: divisionsRes.data || [],
          homework: homeworkRes.data || [],
          announcements: announcementsRes.data || [],
          timetable,
          rooms: roomsRes.data || [],
          classFees: classFeesRes.data || [],
          challenges: challengesRes.data || [],
          studentChallenges,
          studentXp,
          studentBadges,
          studentRewards,
          termExams: termExamsRes.data || [],
          termExamSubjects: termExamSubjectsRes.data || [],
          termExamResults,
        },
        stats: {
          studentsCount: studentsRes.data?.length || 0,
          attendanceRecords: attendance.length,
          feeRecords: fees.length,
          testsCount: testsRes.data?.length || 0,
          subjectsCount: subjectsRes.data?.length || 0,
          facultyCount: facultyRes.data?.length || 0,
          divisionsCount: divisionsRes.data?.length || 0,
          roomsCount: roomsRes.data?.length || 0,
          homeworkCount: homeworkRes.data?.length || 0,
          announcementsCount: announcementsRes.data?.length || 0,
          challengesCount: challengesRes.data?.length || 0,
          termExamsCount: termExamsRes.data?.length || 0,
          timetableCount: timetable.length,
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

    // RESTORE: Restore data from backup
    if (action === 'restore') {
      console.log('Restoring data for tuition:', tuitionId);
      
      let dataToRestore: any = null;

      // Get backup data either from backupId or uploaded data
      if (backupId) {
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
        dataToRestore = backup.backup_data;
      } else if (uploadedBackupData) {
        dataToRestore = uploadedBackupData;
      } else {
        return new Response(
          JSON.stringify({ error: 'No backup data provided' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Validate backup data structure
      if (!dataToRestore?.data || !dataToRestore?.metadata) {
        return new Response(
          JSON.stringify({ error: 'Invalid backup format' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const restoreResults: Record<string, { success: boolean; count: number; error?: string }> = {};

      // Restore in order of dependencies
      // 1. Divisions first (no dependencies)
      if (dataToRestore.data.divisions?.length > 0) {
        try {
          const divisionsToRestore = dataToRestore.data.divisions.map((d: any) => ({
            ...d,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('divisions')
            .upsert(divisionsToRestore, { onConflict: 'id' });
          restoreResults.divisions = { success: !error, count: divisionsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.divisions = { success: false, count: 0, error: e.message };
        }
      }

      // 2. Faculty
      if (dataToRestore.data.faculty?.length > 0) {
        try {
          const facultyToRestore = dataToRestore.data.faculty.map((f: any) => ({
            ...f,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('faculty')
            .upsert(facultyToRestore, { onConflict: 'id' });
          restoreResults.faculty = { success: !error, count: facultyToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.faculty = { success: false, count: 0, error: e.message };
        }
      }

      // 3. Subjects
      if (dataToRestore.data.subjects?.length > 0) {
        try {
          const subjectsToRestore = dataToRestore.data.subjects.map((s: any) => ({
            ...s,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('subjects')
            .upsert(subjectsToRestore, { onConflict: 'id' });
          restoreResults.subjects = { success: !error, count: subjectsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.subjects = { success: false, count: 0, error: e.message };
        }
      }

      // 4. Rooms
      if (dataToRestore.data.rooms?.length > 0) {
        try {
          const roomsToRestore = dataToRestore.data.rooms.map((r: any) => ({
            ...r,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('rooms')
            .upsert(roomsToRestore, { onConflict: 'id' });
          restoreResults.rooms = { success: !error, count: roomsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.rooms = { success: false, count: 0, error: e.message };
        }
      }

      // 5. Students (depends on divisions)
      if (dataToRestore.data.students?.length > 0) {
        try {
          const studentsToRestore = dataToRestore.data.students.map((s: any) => ({
            ...s,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('students')
            .upsert(studentsToRestore, { onConflict: 'id' });
          restoreResults.students = { success: !error, count: studentsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.students = { success: false, count: 0, error: e.message };
        }
      }

      // 6. Tests
      if (dataToRestore.data.tests?.length > 0) {
        try {
          const testsToRestore = dataToRestore.data.tests.map((t: any) => ({
            ...t,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('weekly_tests')
            .upsert(testsToRestore, { onConflict: 'id' });
          restoreResults.tests = { success: !error, count: testsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.tests = { success: false, count: 0, error: e.message };
        }
      }

      // 7. Homework
      if (dataToRestore.data.homework?.length > 0) {
        try {
          const homeworkToRestore = dataToRestore.data.homework.map((h: any) => ({
            ...h,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('homework')
            .upsert(homeworkToRestore, { onConflict: 'id' });
          restoreResults.homework = { success: !error, count: homeworkToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.homework = { success: false, count: 0, error: e.message };
        }
      }

      // 8. Announcements
      if (dataToRestore.data.announcements?.length > 0) {
        try {
          const announcementsToRestore = dataToRestore.data.announcements.map((a: any) => ({
            ...a,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('announcements')
            .upsert(announcementsToRestore, { onConflict: 'id' });
          restoreResults.announcements = { success: !error, count: announcementsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.announcements = { success: false, count: 0, error: e.message };
        }
      }

      // 9. Timetable (depends on subjects, faculty, rooms)
      if (dataToRestore.data.timetable?.length > 0) {
        try {
          const timetableToRestore = dataToRestore.data.timetable.map((t: any) => ({
            ...t,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('timetable')
            .upsert(timetableToRestore, { onConflict: 'id' });
          restoreResults.timetable = { success: !error, count: timetableToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.timetable = { success: false, count: 0, error: e.message };
        }
      }

      // 10. Attendance (depends on students)
      if (dataToRestore.data.attendance?.length > 0) {
        try {
          // Remove the nested students data before upserting
          const attendanceToRestore = dataToRestore.data.attendance.map((a: any) => {
            const { students, ...attendanceData } = a;
            return attendanceData;
          });
          const { error } = await supabaseAdmin
            .from('student_attendance')
            .upsert(attendanceToRestore, { onConflict: 'id' });
          restoreResults.attendance = { success: !error, count: attendanceToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.attendance = { success: false, count: 0, error: e.message };
        }
      }

      // 11. Fees (depends on students)
      if (dataToRestore.data.fees?.length > 0) {
        try {
          const feesToRestore = dataToRestore.data.fees.map((f: any) => {
            const { students, ...feeData } = f;
            return feeData;
          });
          const { error } = await supabaseAdmin
            .from('student_fees')
            .upsert(feesToRestore, { onConflict: 'id' });
          restoreResults.fees = { success: !error, count: feesToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.fees = { success: false, count: 0, error: e.message };
        }
      }

      // 12. Test Results (depends on students, tests)
      if (dataToRestore.data.testResults?.length > 0) {
        try {
          const testResultsToRestore = dataToRestore.data.testResults.map((tr: any) => {
            const { students, ...resultData } = tr;
            return resultData;
          });
          const { error } = await supabaseAdmin
            .from('student_test_results')
            .upsert(testResultsToRestore, { onConflict: 'id' });
          restoreResults.testResults = { success: !error, count: testResultsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.testResults = { success: false, count: 0, error: e.message };
        }
      }

      // 13. Class Fees
      if (dataToRestore.data.classFees?.length > 0) {
        try {
          const classFeesToRestore = dataToRestore.data.classFees.map((cf: any) => ({
            ...cf,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('class_fees')
            .upsert(classFeesToRestore, { onConflict: 'id' });
          restoreResults.classFees = { success: !error, count: classFeesToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.classFees = { success: false, count: 0, error: e.message };
        }
      }

      // 14. Fee Payments (depends on fees)
      if (dataToRestore.data.feePayments?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('fee_payments')
            .upsert(dataToRestore.data.feePayments, { onConflict: 'id' });
          restoreResults.feePayments = { success: !error, count: dataToRestore.data.feePayments.length, error: error?.message };
        } catch (e: any) {
          restoreResults.feePayments = { success: false, count: 0, error: e.message };
        }
      }

      // 15. Challenges
      if (dataToRestore.data.challenges?.length > 0) {
        try {
          const challengesToRestore = dataToRestore.data.challenges.map((c: any) => ({
            ...c,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('challenges')
            .upsert(challengesToRestore, { onConflict: 'id' });
          restoreResults.challenges = { success: !error, count: challengesToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.challenges = { success: false, count: 0, error: e.message };
        }
      }

      // 16. Student Challenges
      if (dataToRestore.data.studentChallenges?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('student_challenges')
            .upsert(dataToRestore.data.studentChallenges, { onConflict: 'id' });
          restoreResults.studentChallenges = { success: !error, count: dataToRestore.data.studentChallenges.length, error: error?.message };
        } catch (e: any) {
          restoreResults.studentChallenges = { success: false, count: 0, error: e.message };
        }
      }

      // 17. Student XP
      if (dataToRestore.data.studentXp?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('student_xp')
            .upsert(dataToRestore.data.studentXp, { onConflict: 'id' });
          restoreResults.studentXp = { success: !error, count: dataToRestore.data.studentXp.length, error: error?.message };
        } catch (e: any) {
          restoreResults.studentXp = { success: false, count: 0, error: e.message };
        }
      }

      // 18. Student Badges
      if (dataToRestore.data.studentBadges?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('student_badges')
            .upsert(dataToRestore.data.studentBadges, { onConflict: 'id' });
          restoreResults.studentBadges = { success: !error, count: dataToRestore.data.studentBadges.length, error: error?.message };
        } catch (e: any) {
          restoreResults.studentBadges = { success: false, count: 0, error: e.message };
        }
      }

      // 19. Student Rewards
      if (dataToRestore.data.studentRewards?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('student_rewards')
            .upsert(dataToRestore.data.studentRewards, { onConflict: 'id' });
          restoreResults.studentRewards = { success: !error, count: dataToRestore.data.studentRewards.length, error: error?.message };
        } catch (e: any) {
          restoreResults.studentRewards = { success: false, count: 0, error: e.message };
        }
      }

      // 20. Faculty Subjects
      if (dataToRestore.data.facultySubjects?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('faculty_subjects')
            .upsert(dataToRestore.data.facultySubjects, { onConflict: 'id' });
          restoreResults.facultySubjects = { success: !error, count: dataToRestore.data.facultySubjects.length, error: error?.message };
        } catch (e: any) {
          restoreResults.facultySubjects = { success: false, count: 0, error: e.message };
        }
      }

      // 21. Term Exams
      if (dataToRestore.data.termExams?.length > 0) {
        try {
          const termExamsToRestore = dataToRestore.data.termExams.map((te: any) => ({
            ...te,
            tuition_id: tuitionId,
          }));
          const { error } = await supabaseAdmin
            .from('term_exams')
            .upsert(termExamsToRestore, { onConflict: 'id' });
          restoreResults.termExams = { success: !error, count: termExamsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.termExams = { success: false, count: 0, error: e.message };
        }
      }

      // 22. Term Exam Subjects
      if (dataToRestore.data.termExamSubjects?.length > 0) {
        try {
          const termExamSubjectsToRestore = dataToRestore.data.termExamSubjects.map((tes: any) => {
            const { term_exams, ...data } = tes;
            return data;
          });
          const { error } = await supabaseAdmin
            .from('term_exam_subjects')
            .upsert(termExamSubjectsToRestore, { onConflict: 'id' });
          restoreResults.termExamSubjects = { success: !error, count: termExamSubjectsToRestore.length, error: error?.message };
        } catch (e: any) {
          restoreResults.termExamSubjects = { success: false, count: 0, error: e.message };
        }
      }

      // 23. Term Exam Results
      if (dataToRestore.data.termExamResults?.length > 0) {
        try {
          const { error } = await supabaseAdmin
            .from('term_exam_results')
            .upsert(dataToRestore.data.termExamResults, { onConflict: 'id' });
          restoreResults.termExamResults = { success: !error, count: dataToRestore.data.termExamResults.length, error: error?.message };
        } catch (e: any) {
          restoreResults.termExamResults = { success: false, count: 0, error: e.message };
        }
      }

      const successCount = Object.values(restoreResults).filter(r => r.success).length;
      const totalCount = Object.keys(restoreResults).length;

      console.log('Restore completed:', restoreResults);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Restored ${successCount}/${totalCount} data types successfully`,
          results: restoreResults
        }),
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

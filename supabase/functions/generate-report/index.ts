import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import jsPDF from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  type: 'absentees' | 'test-marks' | 'student-report' | 'attendance-calendar';
  classValue?: string;
  startDate?: string;
  endDate?: string;
  testId?: string;
  studentId?: string;
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 reports per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const ipLimit = rateLimitMap.get(ip);
  
  if (!ipLimit || now > ipLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (ipLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  ipLimit.count++;
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check by IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { type, classValue, startDate, endDate, testId, studentId }: ReportRequest = await req.json();

    console.log('Generating report:', { type, classValue, startDate, endDate, testId, studentId });

    let pdfBlob: ArrayBuffer;

    switch (type) {
      case 'absentees':
        pdfBlob = await generateAbsenteesReport(supabaseClient, classValue, startDate, endDate);
        break;
      case 'test-marks':
        pdfBlob = await generateTestMarksReport(supabaseClient, testId!);
        break;
      case 'student-report':
        pdfBlob = await generateStudentReport(supabaseClient, studentId!);
        break;
      case 'attendance-calendar':
        pdfBlob = await generateAttendanceCalendar(supabaseClient, studentId!, startDate, endDate);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return new Response(pdfBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateAbsenteesReport(
  supabase: any,
  classValue?: string,
  startDate?: string,
  endDate?: string
): Promise<ArrayBuffer> {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Absentees Report', 105, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(12);
  const dateRange = `Period: ${startDate || 'All'} to ${endDate || 'All'}`;
  doc.text(dateRange, 105, 30, { align: 'center' });
  
  if (classValue) {
    doc.text(`Class: ${classValue}`, 105, 37, { align: 'center' });
  }

  // Fetch absentees data
  let query = supabase
    .from('student_attendance')
    .select(`
      *,
      students (name, class)
    `)
    .in('status', ['absent', 'excused']);

  if (classValue) {
    query = query.eq('students.class', classValue);
  }
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data: absences, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Error fetching absences:', error);
    throw error;
  }

  // Table headers
  let y = 50;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Date', 15, y);
  doc.text('Student', 45, y);
  doc.text('Class', 110, y);
  doc.text('Status', 140, y);
  doc.text('Notes', 170, y);
  
  y += 7;
  doc.line(15, y, 195, y);
  y += 5;

  // Table rows
  doc.setFont(undefined, 'normal');
  
  if (!absences || absences.length === 0) {
    doc.text('No absences found', 105, y, { align: 'center' });
  } else {
    for (const absence of absences) {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Repeat headers
        doc.setFont(undefined, 'bold');
        doc.text('Date', 15, y);
        doc.text('Student', 45, y);
        doc.text('Class', 110, y);
        doc.text('Status', 140, y);
        doc.text('Notes', 170, y);
        y += 7;
        doc.line(15, y, 195, y);
        y += 5;
        doc.setFont(undefined, 'normal');
      }

      doc.text(absence.date, 15, y);
      doc.text(absence.students?.name || 'Unknown', 45, y);
      doc.text(absence.students?.class || 'N/A', 110, y);
      doc.text(absence.status, 140, y);
      doc.text(absence.notes?.substring(0, 20) || '-', 170, y);
      y += 7;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  return doc.output('arraybuffer');
}

async function generateTestMarksReport(supabase: any, testId: string): Promise<ArrayBuffer> {
  const doc = new jsPDF();

  // Fetch test details
  const { data: test, error: testError } = await supabase
    .from('weekly_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testError) throw testError;

  // Title
  doc.setFontSize(20);
  doc.text('Test Marks Report', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Test: ${test.name}`, 105, 30, { align: 'center' });
  doc.text(`Subject: ${test.subject} | Class: ${test.class}`, 105, 37, { align: 'center' });
  doc.text(`Date: ${test.test_date} | Max Marks: ${test.max_marks}`, 105, 44, { align: 'center' });

  // Fetch test results
  const { data: results, error: resultsError } = await supabase
    .from('student_test_results')
    .select(`
      marks,
      students (name, class)
    `)
    .eq('test_id', testId)
    .order('marks', { ascending: false });

  if (resultsError) throw resultsError;

  // Calculate statistics
  const marks = results.map((r: any) => r.marks);
  const average = marks.reduce((a: number, b: number) => a + b, 0) / marks.length;
  const highest = Math.max(...marks);
  const lowest = Math.min(...marks);

  // Statistics
  doc.setFontSize(10);
  let y = 55;
  doc.text(`Total Students: ${results.length} | Average: ${average.toFixed(2)} | Highest: ${highest} | Lowest: ${lowest}`, 15, y);
  
  y += 10;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Rank', 15, y);
  doc.text('Student Name', 40, y);
  doc.text('Class', 120, y);
  doc.text('Marks', 150, y);
  doc.text('Percentage', 175, y);
  
  y += 7;
  doc.line(15, y, 195, y);
  y += 5;

  // Table rows
  doc.setFont(undefined, 'normal');
  
  results.forEach((result: any, index: number) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      // Repeat headers
      doc.setFont(undefined, 'bold');
      doc.text('Rank', 15, y);
      doc.text('Student Name', 40, y);
      doc.text('Class', 120, y);
      doc.text('Marks', 150, y);
      doc.text('Percentage', 175, y);
      y += 7;
      doc.line(15, y, 195, y);
      y += 5;
      doc.setFont(undefined, 'normal');
    }

    const percentage = ((result.marks / test.max_marks) * 100).toFixed(2);
    doc.text(`${index + 1}`, 15, y);
    doc.text(result.students?.name || 'Unknown', 40, y);
    doc.text(result.students?.class || 'N/A', 120, y);
    doc.text(`${result.marks}/${test.max_marks}`, 150, y);
    doc.text(`${percentage}%`, 175, y);
    y += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  return doc.output('arraybuffer');
}

async function generateStudentReport(supabase: any, studentId: string): Promise<ArrayBuffer> {
  const doc = new jsPDF();

  // Fetch student details
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, divisions(name)')
    .eq('id', studentId)
    .single();

  if (studentError) throw studentError;

  // Title
  doc.setFontSize(20);
  doc.text('Student Report Card', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(student.name, 105, 32, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Class: ${student.class} ${student.divisions?.name ? `| Division: ${student.divisions.name}` : ''} ${student.roll_no ? `| Roll No: ${student.roll_no}` : ''}`, 105, 40, { align: 'center' });

  let y = 55;

  // XP Section
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Performance Summary', 15, y);
  y += 8;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Total XP: ${student.total_xp} points`, 15, y);
  y += 12;

  // Fetch attendance records
  const { data: attendance } = await supabase
    .from('student_attendance')
    .select('date, status')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  // Attendance Summary
  if (attendance && attendance.length > 0) {
    const present = attendance.filter((a: any) => a.status === 'present').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const excused = attendance.filter((a: any) => a.status === 'excused').length;
    const total = attendance.length;
    const attendanceRate = ((present / total) * 100).toFixed(1);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Attendance Summary', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Create a nice box for attendance stats
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, y, 180, 18);
    
    const statWidth = 45;
    doc.text(`Present: ${present}`, 20, y + 7);
    doc.text(`Absent: ${absent}`, 20 + statWidth, y + 7);
    doc.text(`Late: ${late}`, 20 + statWidth * 2, y + 7);
    doc.text(`Excused: ${excused}`, 20 + statWidth * 3, y + 7);
    doc.setFont(undefined, 'bold');
    doc.text(`Attendance Rate: ${attendanceRate}%`, 20, y + 14);
    doc.setFont(undefined, 'normal');
    
    y += 25;

    // Attendance Calendar (last 30 days)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Recent Attendance (Last 30 Records)', 15, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    
    const recentAttendance = attendance.slice(0, 30);
    let col = 0;
    const colWidth = 36;
    const rowHeight = 6;
    
    recentAttendance.forEach((record: any, index: number) => {
      const x = 15 + (col * colWidth);
      const statusSymbol = record.status === 'present' ? 'P' : 
                          record.status === 'absent' ? 'A' : 
                          record.status === 'late' ? 'L' : 'E';
      doc.text(`${record.date}: ${statusSymbol}`, x, y);
      col++;
      if (col >= 5) {
        col = 0;
        y += rowHeight;
      }
    });
    
    if (col !== 0) y += rowHeight;
    y += 5;
  }

  // Fetch test results
  const { data: testResults } = await supabase
    .from('student_test_results')
    .select(`
      marks,
      weekly_tests (name, subject, max_marks, test_date)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (testResults && testResults.length > 0) {
    // Check if we need a new page
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Test Performance', 15, y);
    y += 10;

    // Calculate overall test statistics
    const totalMarks = testResults.reduce((sum: number, r: any) => sum + r.marks, 0);
    const maxMarks = testResults.reduce((sum: number, r: any) => sum + r.weekly_tests.max_marks, 0);
    const overallPercentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(1) : 0;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Tests Taken: ${testResults.length} | Overall Score: ${totalMarks}/${maxMarks} (${overallPercentage}%)`, 15, y);
    y += 8;

    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Test Name', 15, y);
    doc.text('Subject', 75, y);
    doc.text('Date', 115, y);
    doc.text('Marks', 145, y);
    doc.text('%', 175, y);
    y += 5;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont(undefined, 'normal');
    testResults.slice(0, 15).forEach((result: any) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Repeat headers
        doc.setFont(undefined, 'bold');
        doc.text('Test Name', 15, y);
        doc.text('Subject', 75, y);
        doc.text('Date', 115, y);
        doc.text('Marks', 145, y);
        doc.text('%', 175, y);
        y += 5;
        doc.line(15, y, 195, y);
        y += 5;
        doc.setFont(undefined, 'normal');
      }
      
      const percentage = ((result.marks / result.weekly_tests.max_marks) * 100).toFixed(1);
      doc.text(result.weekly_tests.name.substring(0, 25), 15, y);
      doc.text(result.weekly_tests.subject.substring(0, 15), 75, y);
      doc.text(result.weekly_tests.test_date, 115, y);
      doc.text(`${result.marks}/${result.weekly_tests.max_marks}`, 145, y);
      doc.text(`${percentage}%`, 175, y);
      y += 6;
    });

    // Subject-wise performance summary
    if (y > 230) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Subject-wise Performance', 15, y);
    y += 8;

    // Group by subject
    const subjectStats: Record<string, { total: number; max: number; count: number }> = {};
    testResults.forEach((result: any) => {
      const subject = result.weekly_tests.subject;
      if (!subjectStats[subject]) {
        subjectStats[subject] = { total: 0, max: 0, count: 0 };
      }
      subjectStats[subject].total += result.marks;
      subjectStats[subject].max += result.weekly_tests.max_marks;
      subjectStats[subject].count++;
    });

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Subject', 15, y);
    doc.text('Tests', 75, y);
    doc.text('Total Marks', 105, y);
    doc.text('Average %', 155, y);
    y += 5;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont(undefined, 'normal');
    Object.entries(subjectStats).forEach(([subject, stats]) => {
      const avg = ((stats.total / stats.max) * 100).toFixed(1);
      doc.text(subject, 15, y);
      doc.text(stats.count.toString(), 75, y);
      doc.text(`${stats.total}/${stats.max}`, 105, y);
      doc.text(`${avg}%`, 155, y);
      y += 6;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  return doc.output('arraybuffer');
}

async function generateAttendanceCalendar(
  supabase: any,
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<ArrayBuffer> {
  const doc = new jsPDF();

  // Fetch student details
  const { data: student } = await supabase
    .from('students')
    .select('name, class')
    .eq('id', studentId)
    .single();

  // Title
  doc.setFontSize(20);
  doc.text('Attendance Calendar', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Student: ${student?.name || 'Unknown'}`, 105, 30, { align: 'center' });
  doc.text(`Class: ${student?.class || 'N/A'}`, 105, 37, { align: 'center' });
  
  const dateRange = `Period: ${startDate || 'All'} to ${endDate || 'All'}`;
  doc.text(dateRange, 105, 44, { align: 'center' });

  // Fetch attendance records
  let query = supabase
    .from('student_attendance')
    .select('*')
    .eq('student_id', studentId);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data: attendance, error } = await query.order('date', { ascending: false });

  if (error) throw error;

  let y = 55;

  // Statistics
  if (attendance && attendance.length > 0) {
    const present = attendance.filter((a: any) => a.status === 'present').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const excused = attendance.filter((a: any) => a.status === 'excused').length;
    const percentage = ((present / attendance.length) * 100).toFixed(2);

    doc.setFontSize(10);
    doc.text(`Present: ${present} | Absent: ${absent} | Late: ${late} | Excused: ${excused} | Rate: ${percentage}%`, 15, y);
    y += 10;
  }

  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Date', 15, y);
  doc.text('Day', 45, y);
  doc.text('Status', 80, y);
  doc.text('Notes', 120, y);
  
  y += 7;
  doc.line(15, y, 195, y);
  y += 5;

  // Table rows
  doc.setFont(undefined, 'normal');
  
  if (!attendance || attendance.length === 0) {
    doc.text('No attendance records found', 105, y, { align: 'center' });
  } else {
    for (const record of attendance) {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Repeat headers
        doc.setFont(undefined, 'bold');
        doc.text('Date', 15, y);
        doc.text('Day', 45, y);
        doc.text('Status', 80, y);
        doc.text('Notes', 120, y);
        y += 7;
        doc.line(15, y, 195, y);
        y += 5;
        doc.setFont(undefined, 'normal');
      }

      const date = new Date(record.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      doc.text(record.date, 15, y);
      doc.text(dayName, 45, y);
      doc.text(record.status.toUpperCase(), 80, y);
      doc.text(record.notes?.substring(0, 40) || '-', 120, y);
      y += 7;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

  return doc.output('arraybuffer');
}

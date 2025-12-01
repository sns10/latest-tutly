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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      JSON.stringify({ error: error?.message || 'Unknown error' }),
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
    .select('*')
    .eq('id', studentId)
    .single();

  if (studentError) throw studentError;

  // Title
  doc.setFontSize(20);
  doc.text('Student Report', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(student.name, 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Class: ${student.class} | Team: ${student.team || 'Not assigned'}`, 105, 37, { align: 'center' });

  let y = 50;

  // XP Section
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('XP Summary', 15, y);
  y += 7;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Total XP: ${student.total_xp}`, 15, y);
  y += 15;

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
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Recent Test Performance', 15, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Test', 15, y);
    doc.text('Subject', 80, y);
    doc.text('Marks', 130, y);
    doc.text('Percentage', 160, y);
    y += 7;
    doc.line(15, y, 195, y);
    y += 5;

    doc.setFont(undefined, 'normal');
    testResults.slice(0, 10).forEach((result: any) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const percentage = ((result.marks / result.weekly_tests.max_marks) * 100).toFixed(2);
      doc.text(result.weekly_tests.name.substring(0, 30), 15, y);
      doc.text(result.weekly_tests.subject, 80, y);
      doc.text(`${result.marks}/${result.weekly_tests.max_marks}`, 130, y);
      doc.text(`${percentage}%`, 160, y);
      y += 7;
    });
  }

  y += 10;

  // Fetch attendance summary
  const { data: attendance } = await supabase
    .from('student_attendance')
    .select('status')
    .eq('student_id', studentId);

  if (attendance && attendance.length > 0) {
    const present = attendance.filter((a: any) => a.status === 'present').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const total = attendance.length;
    const percentage = ((present / total) * 100).toFixed(2);

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Attendance Summary', 15, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Days: ${total}`, 15, y);
    doc.text(`Present: ${present}`, 70, y);
    doc.text(`Absent: ${absent}`, 125, y);
    doc.text(`Late: ${late}`, 180, y);
    y += 7;
    doc.text(`Attendance Rate: ${percentage}%`, 15, y);
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

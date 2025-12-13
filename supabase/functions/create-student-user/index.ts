import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStudentUserRequest {
  studentId: string;
  email: string;
  password: string;
  studentName: string;
  tuitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { studentId, email, password, studentName, tuitionId }: CreateStudentUserRequest = await req.json();

    console.log(`Creating user account for student: ${studentName} (${email})`);

    // Validate inputs
    if (!studentId || !email || !password || !studentName || !tuitionId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (password.length < 6) {
      console.error('Password too short');
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      console.log('User already exists, linking to student');
      userId = existingUser.id;
    } else {
      // Create new user with auto-confirm
      console.log('Creating new user account...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: studentName,
          is_student: true
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!newUser?.user) {
        console.error('User creation failed - no user returned');
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      userId = newUser.user.id;
      console.log('User created successfully:', userId);
    }

    // Update student record with user_id and email
    console.log(`Linking student ${studentId} to user ${userId}`);
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ 
        user_id: userId,
        email: email 
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('Error updating student:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to link student to user account' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Ensure student role is assigned
    console.log('Assigning student role...');
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'student',
        tuition_id: tuitionId
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Don't fail the whole operation, just log it
    }

    // Update profile with tuition_id
    console.log('Updating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: studentName,
        tuition_id: tuitionId
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail, the profile might already exist
    }

    console.log('Student user account created and linked successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: 'Student account created successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in create-student-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);

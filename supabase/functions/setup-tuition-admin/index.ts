import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { adminEmail, adminPassword, adminName, tuitionId } = await req.json()

    if (!adminEmail || !tuitionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      throw listError
    }

    const existingUser = existingUsers.users.find(u => u.email === adminEmail)
    let userId: string

    if (existingUser) {
      // User exists - use their ID
      userId = existingUser.id
      console.log('Found existing user:', userId)
    } else {
      // Create new user
      if (!adminPassword) {
        return new Response(
          JSON.stringify({ error: 'Password required for new user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminName }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }

      userId = newUser.user.id
      console.log('Created new user:', userId)
    }

    // Set up profile and role using the existing database function
    const { error: setupError } = await supabaseAdmin.rpc('setup_tuition_admin', {
      _user_id: userId,
      _tuition_id: tuitionId,
      _full_name: adminName || adminEmail
    })

    if (setupError) {
      console.error('Error setting up tuition admin:', setupError)
      throw setupError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        isNewUser: !existingUser 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in setup-tuition-admin:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
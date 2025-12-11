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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { adminEmail, adminPassword, adminName, tuitionId } = await req.json()

    console.log('Received request:', { adminEmail, adminName, tuitionId, hasPassword: !!adminPassword })

    if (!adminEmail || !tuitionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: adminEmail and tuitionId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists by listing users and searching by email
    let existingUser = null
    let page = 1
    const perPage = 1000

    // Search through pages of users to find one with matching email
    while (true) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (listError) {
        console.error('Error listing users:', listError)
        return new Response(
          JSON.stringify({ error: `Failed to search for users: ${listError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const foundUser = usersData?.users?.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase())
      if (foundUser) {
        existingUser = foundUser
        break
      }

      // If we got fewer users than requested, we've reached the end
      if (!usersData?.users || usersData.users.length < perPage) {
        break
      }

      page++
    }

    let userId: string
    let isNewUser = false

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

      if (adminPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminName || adminEmail }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!newUser?.user?.id) {
        console.error('User created but no ID returned')
        return new Response(
          JSON.stringify({ error: 'User created but no ID returned' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id
      isNewUser = true
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
      return new Response(
        JSON.stringify({ error: `Failed to assign admin role: ${setupError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully set up tuition admin for user:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        isNewUser 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error in setup-tuition-admin:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

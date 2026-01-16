import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationData {
  tuitionId: string;
  name: string;
  class: string;
  divisionId?: string | null;
  rollNo?: number | null;
  dateOfBirth: string;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  parentName?: string | null;
  parentPhone: string;
  address?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client for public registration
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const data: RegistrationData = await req.json();

    // Validate required fields
    if (!data.tuitionId || !data.name || !data.class || !data.dateOfBirth || !data.parentPhone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tuitionId, name, class, dateOfBirth, parentPhone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tuition exists and is active
    const { data: tuition, error: tuitionError } = await supabase
      .from("tuitions")
      .select("id, is_active")
      .eq("id", data.tuitionId)
      .single();

    if (tuitionError || !tuition) {
      return new Response(
        JSON.stringify({ error: "Tuition center not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tuition.is_active) {
      return new Response(
        JSON.stringify({ error: "This tuition center is not accepting registrations" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate class value
    const validClasses = ["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
    if (!validClasses.includes(data.class)) {
      return new Response(
        JSON.stringify({ error: "Invalid class value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate division if provided
    if (data.divisionId) {
      const { data: division, error: divError } = await supabase
        .from("divisions")
        .select("id")
        .eq("id", data.divisionId)
        .eq("tuition_id", data.tuitionId)
        .eq("class", data.class)
        .single();

      if (divError || !division) {
        return new Response(
          JSON.stringify({ error: "Invalid division for the selected class" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate a random avatar
    const avatars = [
      'photo-1582562124811-c09040d0a901',
      'photo-1535268647677-300dbf3d78d1',
      'photo-1501286353178-1ec881214838',
      'photo-1441057206919-63d19fac2369',
    ];
    const randomAvatar = `https://images.unsplash.com/${avatars[Math.floor(Math.random() * avatars.length)]}?w=500&h=500&fit=crop`;

    // Insert student record
    const { data: student, error: insertError } = await supabase
      .from("students")
      .insert({
        tuition_id: data.tuitionId,
        name: data.name.trim(),
        class: data.class,
        division_id: data.divisionId || null,
        roll_no: data.rollNo || null,
        date_of_birth: data.dateOfBirth,
        gender: data.gender || null,
        email: data.email || null,
        phone: data.phone || null,
        parent_name: data.parentName || null,
        parent_phone: data.parentPhone,
        address: data.address || null,
        avatar: randomAvatar,
        total_xp: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting student:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to register student. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize XP records
    await supabase.from("student_xp").insert([
      { student_id: student.id, category: "blackout", amount: 0 },
      { student_id: student.id, category: "futureMe", amount: 0 },
      { student_id: student.id, category: "recallWar", amount: 0 },
    ]);

    return new Response(
      JSON.stringify({ success: true, studentId: student.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

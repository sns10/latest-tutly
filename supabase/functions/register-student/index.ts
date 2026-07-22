import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validClasses = ["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"] as const;
const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

const optionalPhone = z.string().regex(phoneRegex).optional().nullable().or(z.literal(""));
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().or(z.literal(""));

const RegistrationSchema = z.object({
  tuitionId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  class: z.enum(validClasses),
  divisionId: z.string().uuid().optional().nullable(),
  rollNo: z.number().int().min(1).max(1000).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: optionalText(20),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  phone: optionalPhone,
  parentName: optionalText(100),
  parentPhone: optionalPhone,
  fatherPhone: z.string().regex(phoneRegex),
  motherPhone: optionalPhone,
  address: optionalText(500),
  schoolName: optionalText(200),
});

// In-memory rate limiter (per instance): 5 IP/5min, 20 tuition/5min
const RATE_WINDOW_MS = 5 * 60 * 1000;
const IP_LIMIT = 5;
const TUITION_LIMIT = 20;
const ipHits = new Map<string, { count: number; reset: number }>();
const tuitionHits = new Map<string, { count: number; reset: number }>();

function hit(map: Map<string, { count: number; reset: number }>, key: string, limit: number): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || entry.reset < now) {
    map.set(key, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (!hit(ipHits, ip, IP_LIMIT)) {
      return new Response(
        JSON.stringify({ error: "Too many registration attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = RegistrationSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid registration data", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const data = parsed.data;

    const birth = new Date(data.dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date of birth" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const ageYears = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 3 || ageYears > 30) {
      return new Response(
        JSON.stringify({ error: "Date of birth is out of the accepted range" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hit(tuitionHits, data.tuitionId, TUITION_LIMIT)) {
      return new Response(
        JSON.stringify({ error: "This center is receiving too many registrations right now. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const avatars = [
      "photo-1582562124811-c09040d0a901",
      "photo-1535268647677-300dbf3d78d1",
      "photo-1501286353178-1ec881214838",
      "photo-1441057206919-63d19fac2369",
    ];
    const randomAvatar = `https://images.unsplash.com/${avatars[Math.floor(Math.random() * avatars.length)]}?w=500&h=500&fit=crop`;

    const { data: student, error: insertError } = await supabase
      .from("students")
      .insert({
        tuition_id: data.tuitionId,
        name: data.name.trim(),
        class: data.class,
        division_id: data.divisionId ?? null,
        roll_no: data.rollNo ?? null,
        date_of_birth: data.dateOfBirth,
        gender: emptyToNull(data.gender),
        email: emptyToNull(data.email),
        phone: emptyToNull(data.phone),
        parent_name: emptyToNull(data.parentName),
        parent_phone: data.fatherPhone || emptyToNull(data.parentPhone),
        father_phone: data.fatherPhone,
        mother_phone: emptyToNull(data.motherPhone),
        address: emptyToNull(data.address),
        school_name: emptyToNull(data.schoolName),
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

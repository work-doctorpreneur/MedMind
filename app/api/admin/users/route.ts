import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, first_name, last_name, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Create user in Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name }
    });

    if (authError) throw authError;

    // Create/Update profile
    const { data: profileData, error: profileError } = await adminSupabase
      .from("profiles")
      .update({
        first_name,
        last_name,
        role: "doctor",
        status: "active",
        plan: "free"
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({ user: profileData });
  } catch (error: any) {
    console.error("Admin user creation error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

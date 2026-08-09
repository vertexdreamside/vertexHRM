import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";

// Creates both the Supabase Auth account and the matching app_users row
// in one request — these have to stay in sync, so this route is the
// only place either gets created (the client never inserts into
// app_users directly for a new user).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: caller }
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // User creation is a system_config-level action — only roles with
  // can_add on system_config (System Administrator, per the seeded
  // matrix) may create logins. Previously this route only checked
  // "is the caller logged in," which meant any authenticated account,
  // including a plain Employee-role one, could create arbitrary new
  // logins by calling this endpoint directly.
  const authorized = await hasPermission(supabase, caller.id, "system_config", "can_add");
  if (!authorized) {
    return NextResponse.json({ error: "You don't have permission to create user accounts." }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, username, roleId, employeeId, status } = body;

  if (!email || !password || !username || !roleId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authResult, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError || !authResult.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create the login account" },
      { status: 400 }
    );
  }

  const { error: insertError } = await admin.from("app_users").insert({
    id: authResult.user.id,
    username,
    role_id: roleId,
    employee_id: employeeId || null,
    status: status ?? "enabled"
  });

  if (insertError) {
    // Don't leave an auth account with no matching app_users row.
    await admin.auth.admin.deleteUser(authResult.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    user_id: caller.id,
    action: "Create",
    module: "Users",
    details: { created_user_id: authResult.user.id, username }
  });

  return NextResponse.json({ id: authResult.user.id });
}

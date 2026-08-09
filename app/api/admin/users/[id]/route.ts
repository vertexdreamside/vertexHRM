import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: caller }
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // This is the most important place this check was missing — without
  // it, any authenticated user could PATCH their own account (or
  // anyone else's) and set role_id to System Administrator, granting
  // themselves full admin access. Same system_config/can_edit gate as
  // the rest of user management.
  const authorized = await hasPermission(supabase, caller.id, "system_config", "can_edit");
  if (!authorized) {
    return NextResponse.json({ error: "You don't have permission to edit user accounts." }, { status: 403 });
  }

  const body = await request.json();
  const admin = createAdminClient();

  if (body.newPassword) {
    const { error } = await admin.auth.admin.updateUserById(params.id, {
      password: body.newPassword
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.username !== undefined) updates.username = body.username;
  if (body.roleId !== undefined) updates.role_id = body.roleId;
  if (body.employeeId !== undefined) updates.employee_id = body.employeeId || null;
  if (body.status !== undefined) updates.status = body.status;
  // Force-logout mechanism shared with Active Sessions (§5.9) — see
  // app/(dashboard)/layout.tsx for the enforcement side. Disabling a
  // user also sets this automatically so an already-open session can't
  // keep working after being disabled — the gap noted when Users was
  // first wired.
  if (body.forceLogout || body.status === "disabled") {
    updates.force_logout_after = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("app_users").update(updates).eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  await admin.from("audit_log").insert({
    user_id: caller.id,
    action: body.roleId !== undefined ? "Permission Change" : "Update",
    module: "Users",
    details: { target_user_id: params.id, updates }
  });
  // Active Sessions revocation on disable is still noted separately —
  // that feature is seed data, not yet wired to a real session table
  // beyond the force_logout_after mechanism already applied above.

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: caller }
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authorized = await hasPermission(supabase, caller.id, "system_config", "can_delete");
  if (!authorized) {
    return NextResponse.json({ error: "You don't have permission to delete user accounts." }, { status: 403 });
  }

  const admin = createAdminClient();
  // Deleting the auth user cascades to app_users via the FK in
  // migration 0001 (`references auth.users(id) on delete cascade`) —
  // deleting only the app_users row would leave an orphaned auth
  // account able to still log in with no role/permissions resolvable.
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    user_id: caller.id,
    action: "Delete",
    module: "Users",
    details: { deleted_user_id: params.id }
  });

  return NextResponse.json({ ok: true });
}

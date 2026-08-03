import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  // TODO: write audit_log row — action: 'Update' or 'Permission Change'.
  // TODO: if status changed to 'disabled', also revoke active sessions
  // (§5.9) — not wired since Active Sessions is still seed data too.

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

  const admin = createAdminClient();
  // Deleting the auth user cascades to app_users via the FK in
  // migration 0001 (`references auth.users(id) on delete cascade`) —
  // deleting only the app_users row would leave an orphaned auth
  // account able to still log in with no role/permissions resolvable.
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // TODO: write audit_log row — action: 'Delete', module: 'Users'.

  return NextResponse.json({ ok: true });
}

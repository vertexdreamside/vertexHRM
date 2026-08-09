import type { SupabaseClient } from "@supabase/supabase-js";

export type PermissionAction = "can_view" | "can_add" | "can_edit" | "can_delete" | "can_approve";

/**
 * Checks whether the given caller (an auth.users id) has the named
 * permission on the named module, via their role_permissions row.
 *
 * This is the check that was missing from every privileged API route
 * in this build — each one only verified "is this person logged in,"
 * not "is this person's role actually allowed to do this." A logged-in
 * Employee-role account could otherwise call these routes directly
 * (bypassing the UI, which does enforce roles) and create arbitrary
 * user logins or permanently delete records.
 *
 * Uses the caller's own Supabase client (not the service-role admin
 * client) for the two lookups so RLS still applies to this check
 * itself — matches the stated requirement that permission checks use
 * the same RBAC the rest of the app relies on, not a bypass.
 */
export async function hasPermission(
  supabase: SupabaseClient,
  callerId: string,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  const { data: appUser } = await supabase
    .from("app_users")
    .select("role_id")
    .eq("id", callerId)
    .single();

  if (!appUser?.role_id) return false;

  const { data: permission } = await supabase
    .from("role_permissions")
    .select(action)
    .eq("role_id", appUser.role_id)
    .eq("module", module)
    .single();

  const row = permission as Record<PermissionAction, boolean> | null;
  return Boolean(row?.[action]);
}

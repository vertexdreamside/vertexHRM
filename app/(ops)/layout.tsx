import { OpsSidebar } from "@/components/layout/OpsSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";

// Admin Operations is deliberately gated at two levels, per request:
// (1) a single switch that can disable the whole space
//     (modules.admin_ops — Configuration §5.5's existing pattern),
// (2) per-role access via role_permissions (module = 'admin_ops') —
//     "user levels," not just a blanket on/off for everyone.
// Checked here, server-side, on every page in this route group —
// same enforcement point as the force-logout check in the Vertex HRM
// layout, not a client-side hide that a direct URL visit could skip.
export default async function OpsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: moduleRow }, { data: appUser }] = await Promise.all([
    supabase.from("modules").select("enabled").eq("key", "admin_ops").single(),
    supabase.from("app_users").select("role_id").eq("id", user.id).single()
  ]);

  let canView = false;
  if (moduleRow?.enabled && appUser?.role_id) {
    const { data: permission } = await supabase
      .from("role_permissions")
      .select("can_view")
      .eq("role_id", appUser.role_id)
      .eq("module", "admin_ops")
      .single();
    canView = permission?.can_view ?? false;
  }

  if (!moduleRow?.enabled || !canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-6">
        <div className="max-w-sm rounded-card border border-surface-border bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-state-warningBg text-state-warning">
            <ShieldOff size={20} />
          </div>
          <h1 className="mt-4 font-display text-lg font-medium text-ink">Admin Operations unavailable</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {!moduleRow?.enabled
              ? "This module has been disabled for your organization."
              : "Your role doesn't have access to this space."}
          </p>
          <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to Vertex HRM
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <OpsSidebar />
      <div className="flex flex-1 flex-col bg-surface-subtle">
        <Topbar userName={user.email ?? "Account"} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

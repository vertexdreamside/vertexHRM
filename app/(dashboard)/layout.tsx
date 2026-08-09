import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function decodeJwtIat(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    return typeof decoded.iat === "number" ? decoded.iat : null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
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

  // Enforces both Active Sessions' "force logout" (§5.9) and Users'
  // "disabling should revoke sessions" (§1.1, noted as a gap when
  // Users was first wired) — the same mechanism does both, checked on
  // every dashboard page load rather than only at sign-in.
  const [{ data: appUser }, { data: { session } }, { data: modulesData }] = await Promise.all([
    supabase.from("app_users").select("status, force_logout_after").eq("id", user.id).single(),
    supabase.auth.getSession(),
    supabase.from("modules").select("key, enabled")
  ]);

  const sessionIssuedAt = session ? decodeJwtIat(session.access_token) : null;
  const forceLogoutTime = appUser?.force_logout_after ? new Date(appUser.force_logout_after).getTime() / 1000 : null;

  const shouldSignOut =
    appUser?.status === "disabled" ||
    (forceLogoutTime !== null && sessionIssuedAt !== null && sessionIssuedAt < forceLogoutTime);

  if (shouldSignOut) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Modules with no row at all default to shown — only an explicit
  // enabled=false actually hides something, so this can't accidentally
  // hide a module nobody's configured yet.
  const disabledKeys = (modulesData ?? []).filter((m) => !m.enabled).map((m) => m.key);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <Sidebar disabledKeys={disabledKeys} />
      <div className="flex flex-1 flex-col bg-surface-subtle">
        <Topbar userName={user.email ?? "Account"} />
        <main data-tour="main-content" className="flex-1 p-6">{children}</main>
      </div>
      <AssistantWidget />
      <GuidedTour />
    </div>
  );
}

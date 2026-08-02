import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
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
  const [{ data: appUser }, { data: { session } }] = await Promise.all([
    supabase.from("app_users").select("status, force_logout_after").eq("id", user.id).single(),
    supabase.auth.getSession()
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

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <Sidebar />
      <div className="flex flex-1 flex-col bg-surface-subtle">
        <Topbar userName={user.email ?? "Account"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

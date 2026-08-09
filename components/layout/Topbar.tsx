"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Info, LifeBuoy, KeyRound, LogOut, ChevronDown, BookOpen } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

interface PendingCounts {
  leave: number;
  timesheets: number;
  claims: number;
}

// Search lives in the Sidebar now (under the logo), not here — see
// components/layout/Sidebar.tsx.
export function Topbar({ userName, avatarUrl }: { userName: string; avatarUrl?: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pending, setPending] = useState<PendingCounts | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadPending() {
    const [leaveRes, timesheetsRes, claimsRes] = await Promise.all([
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("status", "Submitted"),
      supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "Submitted")
    ]);
    setPending({
      leave: leaveRes.count ?? 0,
      timesheets: timesheetsRes.count ?? 0,
      claims: claimsRes.count ?? 0
    });
  }

  function openNotifications() {
    setNotifOpen((v) => !v);
    if (!pending) loadPending();
  }

  const totalPending = pending ? pending.leave + pending.timesheets + pending.claims : 0;
  const initials = userName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-end border-b border-surface-border bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={openNotifications}
            data-tour="topbar-notifications"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative rounded-full p-2 text-ink-muted transition-transform hover:scale-110 hover:bg-surface-subtle"
          >
            <Bell size={18} aria-hidden="true" />
            {totalPending > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-state-danger text-[10px] font-medium text-white">
                {totalPending > 9 ? "9+" : totalPending}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 z-40 mt-2 w-72 rounded-card border border-surface-border bg-white py-2 shadow-lg">
              <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Awaiting action</p>
              {pending === null ? (
                <p className="px-4 py-3 text-sm text-ink-soft">Loading…</p>
              ) : totalPending === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-soft">You&apos;re all caught up.</p>
              ) : (
                <div className="space-y-0.5">
                  {pending.leave > 0 && (
                    <a href="/leave?tab=leavelist" className="flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-subtle">
                      <span className="text-ink">Leave requests pending</span>
                      <span className="font-medium text-brand-700">{pending.leave}</span>
                    </a>
                  )}
                  {pending.timesheets > 0 && (
                    <a href="/time?tab=employeetimesheets" className="flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-subtle">
                      <span className="text-ink">Timesheets submitted</span>
                      <span className="font-medium text-brand-700">{pending.timesheets}</span>
                    </a>
                  )}
                  {pending.claims > 0 && (
                    <a href="/claims?tab=employeeclaims" className="flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-subtle">
                      <span className="text-ink">Claims submitted</span>
                      <span className="font-medium text-brand-700">{pending.claims}</span>
                    </a>
                  )}
                </div>
              )}
              <p className="mt-2 border-t border-surface-border px-4 pt-2 text-xs text-ink-soft">
                Organization-wide totals — not yet scoped to your specific team.
              </p>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            data-tour="topbar-account"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-subtle"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-medium text-white">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-ink">{userName}</span>
            <ChevronDown size={14} className="text-ink-soft" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-56 rounded-card border border-surface-border bg-white py-1.5 shadow-lg"
            >
              <button
                role="menuitem"
                onClick={() => { setShowAbout(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink hover:bg-surface-subtle"
              >
                <Info size={16} className="text-ink-soft" /> About
              </button>
              <a
                href="/help"
                role="menuitem"
                data-tour="help-link"
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink hover:bg-surface-subtle"
              >
                <BookOpen size={16} className="text-ink-soft" /> Help Centre
              </a>
              <button
                role="menuitem"
                onClick={() => { setShowSupport(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink hover:bg-surface-subtle"
              >
                <LifeBuoy size={16} className="text-ink-soft" /> Support
              </button>
              <button
                role="menuitem"
                onClick={() => { setShowChangePassword(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-ink hover:bg-surface-subtle"
              >
                <KeyRound size={16} className="text-ink-soft" /> Change Password
              </button>
              <div className="my-1 border-t border-surface-border" />
              <button
                role="menuitem"
                onClick={async () => {
                  const sessionRowId = sessionStorage.getItem("vertexhrm_session_row_id");
                  if (sessionRowId) {
                    await supabase.from("user_sessions").update({ logout_at: new Date().toISOString() }).eq("id", sessionRowId);
                    sessionStorage.removeItem("vertexhrm_session_row_id");
                  }
                  await supabase.auth.signOut();
                  router.push("/login");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-state-danger hover:bg-state-dangerBg"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {showAbout && (
        <Modal title="About vertexhrm" onClose={() => setShowAbout(false)}>
          <div className="space-y-2 text-sm text-ink-muted">
            <p><span className="font-medium text-ink">vertexhrm</span> — internal HR and administration platform.</p>
            <p>Version 0.1</p>
            <p>Round Table Seychelles</p>
          </div>
        </Modal>
      )}

      {showSupport && (
        <Modal title="Support" onClose={() => setShowSupport(false)}>
          <div className="space-y-3 text-sm">
            <p className="text-ink-muted">Need help with something in the system?</p>
            <a href="mailto:support@vertexhrm.app" className="block text-brand-700 hover:underline">
              support@vertexhrm.app
            </a>
            <p className="text-xs text-ink-soft">
              For access or permission issues, contact your System Administrator directly.
            </p>
          </div>
        </Modal>
      )}

      {showChangePassword && (
        <Modal title="Change password" onClose={() => setShowChangePassword(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setChangePasswordError(null);
              const form = new FormData(e.currentTarget as HTMLFormElement);
              const currentPassword = String(form.get("currentPassword"));
              const newPassword = String(form.get("newPassword"));
              const confirmPassword = String(form.get("confirmPassword"));

              if (newPassword !== confirmPassword) {
                setChangePasswordError("New password and confirmation don't match.");
                return;
              }

              setChangingPassword(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user?.email) {
                setChangingPassword(false);
                setChangePasswordError("Couldn't determine your account email.");
                return;
              }

              const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
              if (verifyError) {
                setChangingPassword(false);
                setChangePasswordError("Current password isn't right.");
                return;
              }

              const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
              setChangingPassword(false);
              if (updateError) {
                setChangePasswordError(updateError.message);
                return;
              }
              setShowChangePassword(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Current password *</label>
              <input name="currentPassword" type="password" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">New password *</label>
              <input name="newPassword" type="password" required minLength={8} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Confirm new password *</label>
              <input name="confirmPassword" type="password" required minLength={8} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <p className="text-xs text-ink-soft">Must meet the Password Policy set in Admin → Configuration.</p>
            {changePasswordError && <p className="text-sm text-state-danger">{changePasswordError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowChangePassword(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                Cancel
              </button>
              <button type="submit" disabled={changingPassword} className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {changingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
}

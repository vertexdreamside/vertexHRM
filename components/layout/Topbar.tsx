"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Search, Info, LifeBuoy, KeyRound, LogOut, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function Topbar({ userName, avatarUrl }: { userName: string; avatarUrl?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-6">
      <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-surface-border bg-surface-subtle px-3 py-2">
        <Search size={16} className="text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search employees, requests, documents..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-2 text-ink-muted hover:bg-surface-subtle"
        >
          <Bell size={18} aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-state-danger" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
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
            onSubmit={(e) => {
              e.preventDefault();
              // TODO(supabase): supabase.auth.updateUser({ password: newPassword })
              // after re-verifying the current password via signInWithPassword.
              setShowChangePassword(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Current password *</label>
              <input type="password" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">New password *</label>
              <input type="password" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Confirm new password *</label>
              <input type="password" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <p className="text-xs text-ink-soft">Must meet the Password Policy set in Admin → Configuration.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowChangePassword(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Update password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </header>
  );
}

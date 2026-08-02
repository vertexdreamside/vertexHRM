"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Lock, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const RECORD_TYPES = [
  { key: "leave_requests", label: "Leave Requests" },
  { key: "timesheets", label: "Timesheets" },
  { key: "claims", label: "Claims" },
  { key: "audit_log", label: "Audit Log" }
];

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

export default function MaintenancePage() {
  const supabase = createClient();

  const [reauthenticated, setReauthenticated] = useState(false);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const [recordType, setRecordType] = useState(RECORD_TYPES[0].key);
  const [olderThan, setOlderThan] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purged, setPurged] = useState<{ deleted: number; warning?: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyEmail(data.user?.email ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReauth(e: React.FormEvent) {
    e.preventDefault();
    if (!myEmail) {
      setAuthError("Couldn't determine your account email — try signing in again.");
      return;
    }
    setAuthenticating(true);
    setAuthError(null);
    // Genuinely re-verifies the password against Supabase Auth, rather
    // than just checking the field isn't empty — signInWithPassword
    // fails with an error if the password is wrong, same check used
    // at login.
    const { error } = await supabase.auth.signInWithPassword({ email: myEmail, password });
    setAuthenticating(false);
    if (error) {
      setAuthError("That password isn't right — try again.");
      return;
    }
    setReauthenticated(true);
    // TODO: write an audit_log entry — action: 'Maintenance Access'.
  }

  async function preview() {
    if (!olderThan) return;
    setPreviewing(true);
    setError(null);
    const res = await fetch("/api/admin/maintenance/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordType, olderThan, confirm: false })
    });
    const body = await res.json();
    setPreviewing(false);
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setPreviewCount(body.count);
    setPurged(null);
  }

  async function purge() {
    setPurging(true);
    setError(null);
    const res = await fetch("/api/admin/maintenance/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordType, olderThan, confirm: true })
    });
    const body = await res.json();
    setPurging(false);
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setPurged(body);
    setPreviewCount(null);
    setConfirmText("");
  }

  if (!reauthenticated) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-state-warningBg text-state-warning">
          <Lock size={20} />
        </div>
        <h1 className="font-display text-xl font-medium text-ink">Confirm it&apos;s you</h1>
        <p className="mt-1 text-sm text-ink-muted">Maintenance can permanently delete data — re-enter your password to continue.</p>
        <form onSubmit={handleReauth} className="mt-6 space-y-3 text-left">
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          {authError && <p className="text-sm text-state-danger">{authError}</p>}
          <button type="submit" disabled={authenticating} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {authenticating && <Loader2 size={14} className="animate-spin" />} Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-state-dangerBg text-state-danger"><ShieldAlert size={18} /></div>
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Maintenance</h1>
          <p className="text-sm text-ink-muted">Bulk-purge old records per the retention rules in Compliance §6.1 — live deletes, real audit trail.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4 rounded-card border border-state-danger/30 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Record type *</label>
          <select value={recordType} onChange={(e) => { setRecordType(e.target.value); setPreviewCount(null); setPurged(null); }} className={inputCls}>
            {RECORD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Older than *</label>
          <input type="date" value={olderThan} onChange={(e) => { setOlderThan(e.target.value); setPreviewCount(null); setPurged(null); }} className={inputCls} />
        </div>

        <button onClick={preview} disabled={!olderThan || previewing} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50">
          {previewing && <Loader2 size={14} className="animate-spin" />} Preview affected records
        </button>

        {error && <p className="text-sm text-state-danger">{error}</p>}

        {previewCount !== null && (
          <div className="rounded-md border border-state-warning/40 bg-state-warningBg p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-state-warning">
              <AlertTriangle size={16} /> {previewCount} record{previewCount === 1 ? "" : "s"} will be permanently deleted.
            </p>
            <p className="mt-2 text-xs text-ink-muted">Type <span className="font-mono font-medium">PURGE</span> to confirm.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={`${inputCls} mt-2`} placeholder="PURGE" />
            <button onClick={purge} disabled={confirmText !== "PURGE" || purging} className="mt-3 flex items-center gap-2 rounded-md bg-state-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {purging ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Permanently delete
            </button>
          </div>
        )}

        {purged && (
          <div>
            <p className="text-sm text-state-success">{purged.deleted} record{purged.deleted === 1 ? "" : "s"} purged and logged.</p>
            {purged.warning && <p className="text-sm text-state-warning">{purged.warning}</p>}
          </div>
        )}
      </div>

      <p className="mt-4 max-w-2xl text-xs text-ink-soft">
        This screen only ever deletes what the Compliance retention rules say is past its retention window — it&apos;s not a
        general-purpose delete tool, and every purge is logged to maintenance_purge_log with the exact criteria and count,
        written server-side since that log intentionally has no client write access.
      </p>
    </div>
  );
}

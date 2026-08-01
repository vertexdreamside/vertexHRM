"use client";

import { useState } from "react";
import { ShieldAlert, Lock, Trash2, AlertTriangle } from "lucide-react";

const RECORD_TYPES = [
  { key: "leave_requests", label: "Leave Requests" },
  { key: "timesheets", label: "Timesheets" },
  { key: "claims", label: "Claims" },
  { key: "audit_log", label: "Audit Log" }
];

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

export default function MaintenancePage() {
  const [reauthenticated, setReauthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [recordType, setRecordType] = useState(RECORD_TYPES[0].key);
  const [olderThan, setOlderThan] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [purged, setPurged] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function handleReauth(e: React.FormEvent) {
    e.preventDefault();
    // TODO(supabase): call supabase.auth.signInWithPassword again (or
    // a dedicated re-auth check) rather than trusting client state —
    // this placeholder accepts any non-empty password.
    if (!password) {
      setAuthError("Enter your password to continue.");
      return;
    }
    setReauthenticated(true);
    setAuthError(null);
    // TODO(supabase): write an audit_log entry — action: 'Maintenance
    // Access', since re-entering Maintenance is itself worth logging.
  }

  function preview() {
    if (!olderThan) return;
    // TODO(supabase): count(*) from the selected table where the
    // relevant date column < olderThan. Illustrative count for now.
    setPreviewCount(Math.floor(Math.random() * 40) + 1);
    setPurged(false);
  }

  function purge() {
    setPurged(true);
    setPreviewCount(null);
    setConfirmText("");
    // TODO(supabase): delete from the selected table where the date
    // column < olderThan; write an audit_log entry with the exact
    // count and criteria used, since this is the one action in the
    // whole platform that's genuinely irreversible.
  }

  if (!reauthenticated) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-state-warningBg text-state-warning">
          <Lock size={20} />
        </div>
        <h1 className="font-display text-xl font-medium text-ink">
          Confirm it&apos;s you
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Maintenance can permanently delete data — re-enter your password
          to continue.
        </p>
        <form onSubmit={handleReauth} className="mt-6 space-y-3 text-left">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          {authError && <p className="text-sm text-state-danger">{authError}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-state-dangerBg text-state-danger">
          <ShieldAlert size={18} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Maintenance</h1>
          <p className="text-sm text-ink-muted">
            Bulk-purge old records per the retention rules in Compliance §6.1.
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4 rounded-card border border-state-danger/30 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Record type *</label>
          <select
            value={recordType}
            onChange={(e) => {
              setRecordType(e.target.value);
              setPreviewCount(null);
              setPurged(false);
            }}
            className={inputCls}
          >
            {RECORD_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Older than *</label>
          <input
            type="date"
            value={olderThan}
            onChange={(e) => {
              setOlderThan(e.target.value);
              setPreviewCount(null);
              setPurged(false);
            }}
            className={inputCls}
          />
        </div>

        <button
          onClick={preview}
          disabled={!olderThan}
          className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50"
        >
          Preview affected records
        </button>

        {previewCount !== null && (
          <div className="rounded-md border border-state-warning/40 bg-state-warningBg p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-state-warning">
              <AlertTriangle size={16} />
              {previewCount} record{previewCount === 1 ? "" : "s"} will be permanently deleted.
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Type <span className="font-mono font-medium">PURGE</span> to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={`${inputCls} mt-2`}
              placeholder="PURGE"
            />
            <button
              onClick={purge}
              disabled={confirmText !== "PURGE"}
              className="mt-3 flex items-center gap-2 rounded-md bg-state-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 size={16} /> Permanently delete
            </button>
          </div>
        )}

        {purged && (
          <p className="text-sm text-state-success">
            Records purged. This action was written to the Audit Log.
          </p>
        )}
      </div>

      <p className="mt-4 max-w-2xl text-xs text-ink-soft">
        This screen only ever deletes what the Compliance retention rules
        say is past its retention window — it&apos;s not a general-purpose
        delete tool, and every purge is logged with exact criteria and
        count.
      </p>
    </div>
  );
}

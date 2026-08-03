"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuditRow { id: string; created_at: string; action: string; module: string | null; details: unknown }

export default function AuditTrailPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("audit_log").select("id, created_at, action, module, details").order("created_at", { ascending: false }).limit(200);
      setEntries((data as AuditRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Audit Trail</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Same underlying log as HRM &rarr; Configuration &rarr; Audit Log — one audit trail for the whole platform, viewed from the Ops side too.
      </p>

      <div className="mt-6 overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Details</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : entries.map((e) => (
              <tr key={e.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-ink-muted">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-ink-muted">{e.action}</td>
                <td className="px-4 py-3 text-ink-muted">{e.module ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{e.details ? JSON.stringify(e.details) : "—"}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">
                No entries yet — same honest gap as HRM&apos;s Audit Log: most modules&apos; writes to this table are still pending TODOs.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

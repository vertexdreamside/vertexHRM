"use client";

import { useEffect, useState } from "react";
import { FileText, Truck, Wallet, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OpsDashboardPage() {
  const supabase = createClient();
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const in30Days = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const [countRes, expiringRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }).not("expiry_date", "is", null).lte("expiry_date", in30Days)
      ]);
      setDocumentCount(countRes.count ?? 0);
      setExpiringCount(expiringRes.count ?? 0);
    }
    load();
  }, [supabase]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Admin Operations</h1>
      <p className="mt-1 text-sm text-ink-muted">A separate space from Vertex HRM — day-to-day office operations.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-surface-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white"><FileText size={18} /></div>
            <div>
              <p className="text-xs text-ink-soft">Documents</p>
              <p className="font-display text-xl font-medium text-ink">{documentCount ?? "—"}</p>
            </div>
          </div>
          {expiringCount !== null && expiringCount > 0 && (
            <p className="mt-2 text-xs font-medium text-state-warning">{expiringCount} expiring within 30 days</p>
          )}
        </div>

        {[
          { label: "Procurement", icon: Truck },
          { label: "Expenses", icon: Wallet },
          { label: "IT Support", icon: Wrench }
        ].map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-card border border-dashed border-surface-border bg-white p-5 opacity-60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-soft"><Icon size={18} /></div>
              <div>
                <p className="text-xs text-ink-soft">{label}</p>
                <p className="text-sm text-ink-soft">Not built yet</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FileText, ShoppingCart, Wallet, Wrench, ClipboardList, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OpsDashboardPage() {
  const supabase = createClient();
  const [counts, setCounts] = useState<{
    documents: number; expiring: number; pendingRequests: number; openTickets: number; pendingPurchaseRequests: number; assets: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const in30Days = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const [docRes, expRes, reqRes, ticketRes, prRes, assetRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }).not("expiry_date", "is", null).lte("expiry_date", in30Days),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("it_tickets").select("id", { count: "exact", head: true }).eq("status", "Open"),
        supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("assets").select("id", { count: "exact", head: true })
      ]);
      setCounts({
        documents: docRes.count ?? 0, expiring: expRes.count ?? 0,
        pendingRequests: reqRes.count ?? 0, openTickets: ticketRes.count ?? 0,
        pendingPurchaseRequests: prRes.count ?? 0, assets: assetRes.count ?? 0
      });
    }
    load();
  }, [supabase]);

  const tiles = [
    { label: "Documents", value: counts?.documents, sub: counts && counts.expiring > 0 ? `${counts.expiring} expiring within 30 days` : undefined, icon: FileText },
    { label: "Pending requests", value: counts?.pendingRequests, icon: ClipboardList },
    { label: "Open IT tickets", value: counts?.openTickets, icon: Wrench },
    { label: "Pending purchase requests", value: counts?.pendingPurchaseRequests, icon: ShoppingCart },
    { label: "Assets on file", value: counts?.assets, icon: Package }
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Admin Operations</h1>
      <p className="mt-1 text-sm text-ink-muted">A separate space from Vertex HRM — day-to-day office operations.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-card border border-surface-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white"><Icon size={18} /></div>
              <div>
                <p className="text-xs text-ink-soft">{label}</p>
                <p className="font-display text-xl font-medium text-ink">{value ?? "—"}</p>
              </div>
            </div>
            {sub && <p className="mt-2 text-xs font-medium text-state-warning">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

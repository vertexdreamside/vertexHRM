"use client";

import { useEffect, useState } from "react";
import { Inbox, ClipboardList, ShoppingCart, Wrench, Wallet, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InboxItem { id: string; icon: typeof Inbox; label: string; sublabel: string; href: string }

export default function InboxPage() {
  const supabase = createClient();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // A real cross-module aggregation — everything genuinely pending
      // right now across the modules that exist, not a mock feed.
      const [reqRes, prRes, ticketRes, expRes] = await Promise.all([
        supabase.from("requests").select("id, description, employees(full_name)").eq("status", "Pending"),
        supabase.from("purchase_requests").select("id, item_description, employees(full_name)").eq("status", "Pending"),
        supabase.from("it_tickets").select("id, subject, employees(full_name)").eq("status", "Open"),
        supabase.from("op_expenses").select("id, description, amount, currency").eq("status", "Pending")
      ]);

      function one<T>(v: T | T[] | null): T | null {
        return Array.isArray(v) ? v[0] ?? null : v;
      }

      const collected: InboxItem[] = [
        ...((reqRes.data ?? []) as { id: string; description: string; employees: unknown }[]).map((r) => ({
          id: `req-${r.id}`, icon: ClipboardList, label: r.description,
          sublabel: `Request from ${(one(r.employees as { full_name: string } | { full_name: string }[])) ?.full_name ?? "someone"}`, href: "/ops/requests"
        })),
        ...((prRes.data ?? []) as { id: string; item_description: string; employees: unknown }[]).map((p) => ({
          id: `pr-${p.id}`, icon: ShoppingCart, label: p.item_description,
          sublabel: `Purchase request from ${(one(p.employees as { full_name: string } | { full_name: string }[])) ?.full_name ?? "someone"}`, href: "/ops/procurement"
        })),
        ...((ticketRes.data ?? []) as { id: string; subject: string; employees: unknown }[]).map((t) => ({
          id: `ticket-${t.id}`, icon: Wrench, label: t.subject,
          sublabel: `Open IT ticket from ${(one(t.employees as { full_name: string } | { full_name: string }[])) ?.full_name ?? "someone"}`, href: "/ops/it-support"
        })),
        ...((expRes.data ?? []) as { id: string; description: string | null; amount: number; currency: string }[]).map((e) => ({
          id: `exp-${e.id}`, icon: Wallet, label: e.description || "Expense",
          sublabel: `${e.currency} ${e.amount} awaiting approval`, href: "/ops/expenses"
        }))
      ];
      setItems(collected);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Inbox</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Everything currently awaiting action across Admin Operations, pulled live from Requests, Procurement, IT Support, and Expenses.
      </p>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((item) => (
            <a key={item.id} href={item.href} className="flex items-center gap-3 rounded-card border border-surface-border bg-white p-4 transition-shadow hover:shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><item.icon size={16} /></span>
              <div>
                <p className="font-medium text-ink">{item.label}</p>
                <p className="text-xs text-ink-soft">{item.sublabel}</p>
              </div>
            </a>
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-card border border-surface-border bg-white p-10 text-center">
              <Inbox size={22} className="text-ink-soft" />
              <p className="text-sm text-ink-soft">Nothing waiting on you right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

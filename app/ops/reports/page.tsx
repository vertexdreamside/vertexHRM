"use client";

import { useEffect, useState } from "react";
import { BarChart3, ShoppingCart, Wrench, Wallet, Package, ClipboardList } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

function Card({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-surface-border bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-medium text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon size={15} /></span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function CountList({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-ink-soft">No data yet.</p>;
  return (
    <div className="flex items-center gap-4">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-sm">
        {data.filter((d) => d.value > 0).map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-ink-muted">{d.name}</span>
            <span className="ml-auto font-medium text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OpsReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [requestsByStatus, setRequestsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [ticketsByStatus, setTicketsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [poByStatus, setPoByStatus] = useState<{ name: string; value: number }[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([]);
  const [assetsByCategory, setAssetsByCategory] = useState<{ name: string; value: number }[]>([]);
  const [lowStock, setLowStock] = useState<{ name: string; quantity_on_hand: number; reorder_level: number }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      function tally(rows: { status?: string }[] | null, key: "status" = "status") {
        const counts: Record<string, number> = {};
        for (const r of rows ?? []) {
          const k = (r as Record<string, string>)[key] ?? "Unknown";
          counts[k] = (counts[k] ?? 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
      }

      const [reqRes, ticketRes, poRes, expRes, assetRes, invRes] = await Promise.all([
        supabase.from("requests").select("status"),
        supabase.from("it_tickets").select("status"),
        supabase.from("purchase_orders").select("status"),
        supabase.from("op_expenses").select("amount, op_expense_categories(name)"),
        supabase.from("assets").select("asset_categories(name)"),
        supabase.from("inventory_items").select("name, quantity_on_hand, reorder_level")
      ]);

      setRequestsByStatus(tally(reqRes.data));
      setTicketsByStatus(tally(ticketRes.data));
      setPoByStatus(tally(poRes.data));

      const expByCat: Record<string, number> = {};
      for (const e of expRes.data ?? []) {
        const cat = Array.isArray(e.op_expense_categories) ? e.op_expense_categories[0]?.name : (e.op_expense_categories as { name: string } | null)?.name;
        const name = cat ?? "Uncategorized";
        expByCat[name] = (expByCat[name] ?? 0) + Number(e.amount ?? 0);
      }
      setExpensesByCategory(Object.entries(expByCat).map(([name, value]) => ({ name, value: Math.round(value) })));

      const assetByCat: Record<string, number> = {};
      for (const a of assetRes.data ?? []) {
        const cat = Array.isArray(a.asset_categories) ? a.asset_categories[0]?.name : (a.asset_categories as { name: string } | null)?.name;
        const name = cat ?? "Uncategorized";
        assetByCat[name] = (assetByCat[name] ?? 0) + 1;
      }
      setAssetsByCategory(Object.entries(assetByCat).map(([name, value]) => ({ name, value })));

      setLowStock((invRes.data ?? []).filter((i) => i.quantity_on_hand <= i.reorder_level));
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return <p className="py-16 text-center text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Reports</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cross-module summaries — live from Supabase, computed from the same data each module already shows individually.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Requests by status" icon={ClipboardList}><CountList data={requestsByStatus} /></Card>
        <Card title="IT tickets by status" icon={Wrench}><CountList data={ticketsByStatus} /></Card>
        <Card title="Purchase orders by status" icon={ShoppingCart}><CountList data={poByStatus} /></Card>
        <Card title="Assets by category" icon={Package}><CountList data={assetsByCategory} /></Card>

        <Card title="Expenses by category (total amount)" icon={Wallet}>
          {expensesByCategory.length === 0 ? <p className="py-6 text-center text-sm text-ink-soft">No expenses logged yet.</p> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByCategory}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={CHART_COLORS[2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Low stock inventory" icon={BarChart3}>
          {lowStock.length === 0 ? <p className="py-6 text-center text-sm text-ink-soft">Nothing below its reorder level.</p> : (
            <ul className="space-y-1.5 text-sm">
              {lowStock.map((i) => (
                <li key={i.name} className="flex items-center justify-between">
                  <span className="text-ink">{i.name}</span>
                  <span className="font-medium text-state-warning">{i.quantity_on_hand} / {i.reorder_level}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

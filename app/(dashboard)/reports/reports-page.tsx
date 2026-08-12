"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Printer, Download, Users, HeartHandshake, Building2, CalendarCheck, CalendarDays } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { clsx } from "clsx";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];
const PERIODS = ["Weekly", "Monthly", "Quarterly", "2nd Qtr", "3rd Qtr", "Last Qtr"] as const;
type Period = (typeof PERIODS)[number];
const TRENDS = ["Employee Onboarding", "Leave Requests", "Claims Submitted"] as const;
type Trend = (typeof TRENDS)[number];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeForPeriod(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  const year = now.getFullYear();
  const quarterStart = (q: number) => new Date(year, (q - 1) * 3, 1);
  const quarterEnd = (q: number) => new Date(year, q * 3, 0);
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  switch (period) {
    case "Weekly": from.setDate(now.getDate() - 7); break;
    case "Monthly": from.setMonth(now.getMonth() - 1); break;
    case "Quarterly": from.setMonth(now.getMonth() - 3); break;
    case "2nd Qtr": return { from: toISODate(quarterStart(2)), to: toISODate(quarterEnd(2)) };
    case "3rd Qtr": return { from: toISODate(quarterStart(3)), to: toISODate(quarterEnd(3)) };
    case "Last Qtr": {
      const lastQ = currentQuarter === 1 ? 4 : currentQuarter - 1;
      const y = currentQuarter === 1 ? year - 1 : year;
      return { from: toISODate(new Date(y, (lastQ - 1) * 3, 1)), to: toISODate(new Date(y, lastQ * 3, 0)) };
    }
  }
  return { from: toISODate(from), to: toISODate(to) };
}

function monthLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function groupByMonth(dates: string[], from: string, to: string): { month: string; count: number }[] {
  const buckets = new Map<string, number>();
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    buckets.set(monthLabel(toISODate(cur)), 0);
    cur.setMonth(cur.getMonth() + 1);
  }
  for (const d of dates) {
    const label = monthLabel(d);
    if (buckets.has(label)) buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
}

export default function ReportsPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>("Monthly");
  const [fromDate, setFromDate] = useState(() => rangeForPeriod("Monthly").from);
  const [toDate, setToDate] = useState(() => rangeForPeriod("Monthly").to);
  const [trend, setTrend] = useState<Trend>("Employee Onboarding");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<{ employees: number; active: number; departments: number; pendingLeave: number } | null>(null);
  const [trendRows, setTrendRows] = useState<{ month: string; count: number }[]>([]);
  const [genderData, setGenderData] = useState<{ name: string; value: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [rawTrendDates, setRawTrendDates] = useState<string[]>([]);

  function applyPeriod(p: Period) {
    setPeriod(p);
    const r = rangeForPeriod(p);
    setFromDate(r.from);
    setToDate(r.to);
  }

  async function load() {
    setLoading(true);
    const [empRes, deptRes, leaveRes] = await Promise.all([
      supabase.from("employees").select("gender, status", { count: "exact" }),
      supabase.from("departments").select("id", { count: "exact", head: true }),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending")
    ]);
    const employees = empRes.data ?? [];
    setStats({
      employees: empRes.count ?? employees.length,
      active: employees.filter((e) => e.status === "active").length,
      departments: deptRes.count ?? 0,
      pendingLeave: leaveRes.count ?? 0
    });

    const genderCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    for (const e of employees) {
      const g = e.gender || "Unspecified";
      genderCounts[g] = (genderCounts[g] ?? 0) + 1;
      const s = e.status === "active" ? "Active" : "Inactive";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    }
    setGenderData(Object.entries(genderCounts).map(([name, value]) => ({ name, value })));
    setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

    let dates: string[] = [];
    if (trend === "Employee Onboarding") {
      const { data } = await supabase.from("employees").select("date_joined").gte("date_joined", fromDate).lte("date_joined", toDate);
      dates = (data ?? []).map((r) => r.date_joined).filter(Boolean) as string[];
    } else if (trend === "Leave Requests") {
      const { data } = await supabase.from("leave_requests").select("created_at").gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59");
      dates = (data ?? []).map((r) => r.created_at?.slice(0, 10)).filter(Boolean) as string[];
    } else {
      const { data } = await supabase.from("claims").select("submitted_date").gte("submitted_date", fromDate).lte("submitted_date", toDate);
      dates = (data ?? []).map((r) => r.submitted_date).filter(Boolean) as string[];
    }
    setRawTrendDates(dates);
    setTrendRows(groupByMonth(dates, fromDate, toDate));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fromDate, toDate, trend]);

  const totalInRange = rawTrendDates.length;

  function handleExport() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trendRows.map((r) => ({ Month: r.month, Count: r.count }))), "Trend");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(genderData), "Gender");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(statusData), "Status");
    XLSX.writeFile(workbook, `reports_${fromDate}_to_${toDate}.xlsx`);
  }

  const tiles = useMemo(() => [
    { icon: Users, label: "Total Employees", value: stats?.employees, color: "from-emerald-400 to-emerald-600" },
    { icon: HeartHandshake, label: "Active Employees", value: stats?.active, color: "from-sky-400 to-sky-600" },
    { icon: Building2, label: "Departments", value: stats?.departments, color: "from-violet-400 to-violet-600" },
    { icon: CalendarCheck, label: "Leave Pending", value: stats?.pendingLeave, color: "from-amber-400 to-amber-600" }
  ], [stats]);

  return (
    <div className="print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">Comprehensive data analysis and reporting.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50">
            <RefreshCw size={14} className={clsx(loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
            <Printer size={14} /> Print
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-card border border-surface-border bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md bg-surface-subtle p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => applyPeriod(p)}
                className={clsx("rounded px-3 py-1.5 text-xs font-medium", period === p ? "bg-state-success text-white" : "text-ink-muted hover:bg-white")}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CalendarDays size={14} className="text-ink-soft" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-md border border-surface-border px-2 py-1.5 text-xs" />
            <span className="text-ink-soft">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-md border border-surface-border px-2 py-1.5 text-xs" />
          </div>
          <select value={trend} onChange={(e) => setTrend(e.target.value as Trend)} className="rounded-md border border-surface-border px-2 py-1.5 text-xs">
            {TRENDS.map((t) => <option key={t} value={t}>Trend: {t}</option>)}
          </select>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Showing {period.toLowerCase()} view &middot; {fromDate} to {toDate} &middot; <span className="font-medium text-state-success">{totalInRange} {trend.toLowerCase()} in this period</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-card border border-surface-border bg-white p-4">
            <span className={clsx("flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white", t.color)}><t.icon size={16} /></span>
            <p className="mt-3 font-display text-2xl font-medium text-ink">{t.value ?? "—"}</p>
            <p className="text-xs text-ink-soft">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="font-display text-base font-medium text-ink">{trend} ({period})</h2>
          <p className="text-xs text-ink-soft">Grouped by month within the selected range.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendRows}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card border border-surface-border bg-white p-5">
          <h2 className="font-display text-base font-medium text-ink">Employee Gender Distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} label>
                  {genderData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-card border border-surface-border bg-white p-5 lg:col-span-2">
          <h2 className="font-display text-base font-medium text-ink">Employee Status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} label>
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

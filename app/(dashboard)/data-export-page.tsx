"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Package, Users, HeartHandshake, Receipt, FileSpreadsheet, FileText, Loader2, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { useModulePermissionWithLoading } from "@/lib/useModulePermission";

// Real export — every download reads live data straight from Supabase
// through the caller's own session (same RLS as everywhere else) and
// builds the file entirely in the browser via SheetJS. Nothing is
// uploaded or emailed anywhere; the "file" only exists as a download.

interface ExportCategory {
  key: string;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
  fetch: (supabase: ReturnType<typeof createClient>) => Promise<Record<string, unknown>[]>;
}

const CATEGORIES: ExportCategory[] = [
  {
    key: "employees",
    label: "Employees",
    description: "Personnel records — job title, department, contact details, and status.",
    icon: Users,
    color: "from-emerald-400 to-emerald-600",
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("employees")
        .select("employee_code, full_name, job_title, employment_status, lifecycle_status, status, email, phone, date_joined, departments(name)");
      return (data ?? []).map((e) => {
        const dept = Array.isArray(e.departments) ? e.departments[0] : e.departments;
        return {
          "Employee ID": e.employee_code, "Full Name": e.full_name, "Job Title": e.job_title,
          "Department": dept?.name ?? "", "Employment Status": e.employment_status, "Employee Status": e.lifecycle_status,
          "Login Status": e.status, "Email": e.email, "Phone": e.phone, "Date Joined": e.date_joined
        };
      });
    }
  },
  {
    key: "leave",
    label: "Leave Records",
    description: "Every leave request — type, dates, day count, and approval status.",
    icon: HeartHandshake,
    color: "from-sky-400 to-sky-600",
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("leave_requests")
        .select("from_date, to_date, days, status, created_at, employees(full_name), leave_type_defaults(name)")
        .order("created_at", { ascending: false });
      return (data ?? []).map((r) => {
        const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees;
        const type = Array.isArray(r.leave_type_defaults) ? r.leave_type_defaults[0] : r.leave_type_defaults;
        return {
          "Employee": emp?.full_name ?? "", "Leave Type": type?.name ?? "", "From": r.from_date, "To": r.to_date,
          "Days": r.days, "Status": r.status, "Submitted": r.created_at?.slice(0, 10)
        };
      });
    }
  },
  {
    key: "claims",
    label: "Claims",
    description: "Expense claims — event, amount, currency, and status.",
    icon: Receipt,
    color: "from-violet-400 to-violet-600",
    fetch: async (supabase) => {
      const { data } = await supabase
        .from("claims")
        .select("reference_id, currency, status, submitted_date, employees(full_name), claim_events(name)")
        .order("submitted_date", { ascending: false });
      return (data ?? []).map((c) => {
        const emp = Array.isArray(c.employees) ? c.employees[0] : c.employees;
        const event = Array.isArray(c.claim_events) ? c.claim_events[0] : c.claim_events;
        return {
          "Reference ID": c.reference_id, "Employee": emp?.full_name ?? "", "Event": event?.name ?? "",
          "Currency": c.currency, "Status": c.status, "Submitted": c.submitted_date
        };
      });
    }
  }
];

function downloadWorkbook(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportPage() {
  const supabase = createClient();
  const { allowed: canExport, loading: checkingPermission } = useModulePermissionWithLoading("system_config", "can_view");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadCounts() {
    setLoading(true);
    const results = await Promise.all(
      CATEGORIES.map(async (c) => ({ key: c.key, rows: await c.fetch(supabase) }))
    );
    const next: Record<string, number> = {};
    results.forEach((r) => { next[r.key] = r.rows.length; });
    setCounts(next);
    setLoading(false);
  }

  useEffect(() => {
    if (!checkingPermission && canExport) loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingPermission, canExport]);

  async function handleExport(cat: ExportCategory, format: "xlsx" | "csv") {
    setBusy(`${cat.key}-${format}`);
    const rows = await cat.fetch(supabase);
    const filename = `${cat.key}_export_${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === "xlsx") downloadWorkbook(rows, cat.label, filename);
    else downloadCsv(rows, filename);
    setBusy(null);
  }

  async function handleExportAll() {
    setBusy("all");
    const workbook = XLSX.utils.book_new();
    for (const cat of CATEGORIES) {
      const rows = await cat.fetch(supabase);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, cat.label.slice(0, 31));
    }
    XLSX.writeFile(workbook, `vertexhrm_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setBusy(null);
  }

  if (checkingPermission) return <p className="py-16 text-center text-sm text-ink-soft">Loading…</p>;

  if (!canExport) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-state-dangerBg text-state-danger"><ShieldAlert size={20} /></div>
        <h1 className="font-display text-xl font-medium text-ink">Admin only</h1>
        <p className="mt-1 text-sm text-ink-muted">You don&apos;t have permission to access Data Export.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white"><Database size={18} /></span>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-medium text-ink">Data Export</h1>
            <span className="rounded-full bg-state-dangerBg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-state-danger">Admin Only</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCounts} disabled={loading} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50">
            <RefreshCw size={14} className={clsx(loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={handleExportAll} disabled={busy !== null} className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {busy === "all" ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Export All (Excel)
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-ink-muted">Download the system&apos;s live records as Excel or CSV. Files are generated in your browser — nothing is sent anywhere.</p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="overflow-hidden rounded-card border border-surface-border bg-white">
            <div className={clsx("bg-gradient-to-r p-4 text-white", cat.color)}>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20"><cat.icon size={18} /></span>
              </div>
              <p className="mt-3 font-display text-base font-medium">{cat.label}</p>
              <p className="text-xs text-white/80">{loading ? "…" : (counts[cat.key] ?? 0)} records</p>
            </div>
            <div className="p-4">
              <p className="mb-4 text-sm text-ink-muted">{cat.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(cat, "xlsx")}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-state-success px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy === `${cat.key}-xlsx` ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel
                </button>
                <button
                  onClick={() => handleExport(cat, "csv")}
                  disabled={busy !== null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-60"
                >
                  {busy === `${cat.key}-csv` ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} CSV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-xs text-ink-soft">
        Exports reflect the current data in the system at the time of download. Excel files (.xlsx) open natively in
        Microsoft Excel, LibreOffice, and Google Sheets; CSV files are plain-text and open anywhere. This module is
        visible to administrator accounts only.
      </p>
    </div>
  );
}

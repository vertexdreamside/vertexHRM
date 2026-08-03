"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Check, X as XIcon, ChevronDown, Search, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const statusStyles: Record<string, string> = {
  Pending: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger",
  Cancelled: "bg-surface-subtle text-ink-soft"
};

function businessDaysBetween(from: string, to: string) {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// ---------------------------------------------------------------------
// Nav — Entitlements, Reports, and Configure expand into their own
// sub-items, matching the reference. Apply/My Leave/Leave List/Assign
// Leave stay flat.
// ---------------------------------------------------------------------
type ViewKey =
  | "apply" | "myleave" | "leavelist" | "assign"
  | "entitlements-add" | "entitlements-employee" | "entitlements-my"
  | "reports-usage" | "reports-my-usage"
  | "configure-period" | "configure-types" | "configure-workweek" | "configure-holidays";

const NAV_ITEMS: { label: string; view?: ViewKey; dropdown?: { label: string; view: ViewKey }[] }[] = [
  { label: "Apply", view: "apply" },
  { label: "My Leave", view: "myleave" },
  { label: "Entitlements", dropdown: [
    { label: "Add Entitlements", view: "entitlements-add" },
    { label: "Employee Entitlements", view: "entitlements-employee" },
    { label: "My Entitlements", view: "entitlements-my" }
  ] },
  { label: "Reports", dropdown: [
    { label: "Leave Entitlements and Usage Report", view: "reports-usage" },
    { label: "My Leave Entitlements and Usage Report", view: "reports-my-usage" }
  ] },
  { label: "Configure", dropdown: [
    { label: "Leave Period", view: "configure-period" },
    { label: "Leave Types", view: "configure-types" },
    { label: "Work Week", view: "configure-workweek" },
    { label: "Holidays", view: "configure-holidays" }
  ] },
  { label: "Leave List", view: "leavelist" },
  { label: "Assign Leave", view: "assign" }
];

function LeaveNav({ active, onChange }: { active: ViewKey; onChange: (v: ViewKey) => void }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenLabel(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="mb-6 flex flex-wrap gap-1.5 border-b border-surface-border pb-4">
      {NAV_ITEMS.map((item) => {
        const isActiveGroup = item.dropdown ? item.dropdown.some((d) => d.view === active) : item.view === active;
        if (!item.dropdown) {
          return (
            <button key={item.label} onClick={() => onChange(item.view!)} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", isActiveGroup ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700")}>
              {item.label}
            </button>
          );
        }
        return (
          <div key={item.label} className="relative">
            <button onClick={() => setOpenLabel((v) => (v === item.label ? null : item.label))} className={clsx("flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", isActiveGroup ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700")}>
              {item.label} <ChevronDown size={14} className={clsx("transition-transform", openLabel === item.label && "rotate-180")} />
            </button>
            {openLabel === item.label && (
              <div className="absolute left-0 z-20 mt-1.5 w-56 rounded-card border border-surface-border bg-white py-1.5 shadow-lg">
                {item.dropdown.map((d) => (
                  <button key={d.view} onClick={() => { onChange(d.view); setOpenLabel(null); }} className={clsx("block w-full px-4 py-2 text-left text-sm hover:bg-surface-subtle", active === d.view ? "font-medium text-brand-700" : "text-ink-muted")}>
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NotBuilt({ note }: { note: string }) {
  return <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">Not built yet — {note}</div>;
}

interface LeaveTypeRow { id: string; name: string; configured_days: number }
interface LeaveRequestRow {
  id: string; from_date: string; to_date: string; days: number; status: string; reason: string | null; created_at: string;
  employee_id: string;
  employees: { full_name: string; department_id: string | null; status: string } | { full_name: string; department_id: string | null; status: string }[] | null;
  leave_type_defaults: { name: string } | { name: string }[] | null;
}
interface EmployeeOption { id: string; full_name: string }
interface DepartmentOption { id: string; name: string }
interface EntitlementRow { id: string; employee_id: string; leave_type_id: string; entitled_days: number }

function LeavePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [view, setView] = useState<ViewKey>((searchParams.get("tab") as ViewKey) || "myleave");
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let employeeId: string | null = null;
    if (user) {
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      employeeId = appUser?.employee_id ?? null;
    }
    setMyEmployeeId(employeeId);

    const [typesRes, requestsRes, employeesRes, deptRes, entRes] = await Promise.all([
      supabase.from("leave_type_defaults").select("id, name, configured_days").order("name"),
      supabase.from("leave_requests").select("id, from_date, to_date, days, status, reason, created_at, employee_id, employees(full_name, department_id, status), leave_type_defaults(name)").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("employee_leave_entitlements").select("id, employee_id, leave_type_id, entitled_days")
    ]);
    setLeaveTypes((typesRes.data as LeaveTypeRow[]) ?? []);
    setRequests((requestsRes.data as unknown as LeaveRequestRow[]) ?? []);
    setEmployees(employeesRes.data ?? []);
    setDepartments((deptRes.data as DepartmentOption[]) ?? []);
    setEntitlements((entRes.data as EntitlementRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (searchParams.get("apply") === "1") setView("apply");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRequest(e: React.FormEvent<HTMLFormElement>, asApproved: boolean) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const fromDate = String(form.get("fromDate"));
    const toDate = String(form.get("toDate"));
    const employeeId = asApproved ? String(form.get("employeeId")) : myEmployeeId;

    if (!employeeId) {
      alert("No employee record linked to your account — set that up in Users first.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: employeeId,
      leave_type_id: form.get("leaveType"),
      from_date: fromDate,
      to_date: toDate,
      days: businessDaysBetween(fromDate, toDate),
      status: asApproved ? "Approved" : "Pending",
      reason: form.get("reason") ?? ""
    });

    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setApplying(false);
    setAssigning(false);
    if (view === "apply") setView("myleave");
    load();
  }

  async function decide(id: string, status: "Approved" | "Rejected") {
    await supabase.from("leave_requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  async function cancel(id: string) {
    await supabase.from("leave_requests").update({ status: "Cancelled" }).eq("id", id);
    load();
  }

  const myRequests = requests.filter((r) => r.employee_id === myEmployeeId);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Leave</h1>
      <p className="mt-1 text-sm text-ink-muted">Apply for leave, track balances, and (for managers) review requests — live from Supabase.</p>

      <LeaveNav active={view} onChange={setView} />

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div>
          {view === "apply" && (
            <div className="max-w-lg rounded-card border border-surface-border bg-white p-6">
              <h2 className="mb-4 font-display text-base font-medium text-ink">Apply for leave</h2>
              <LeaveForm leaveTypes={leaveTypes} saving={saving} onSubmit={(e) => submitRequest(e, false)} onCancel={() => setView("myleave")} inline />
            </div>
          )}

          {view === "myleave" && (
            <div>
              {!myEmployeeId && (
                <div className="mb-4 rounded-card border border-state-warning/30 bg-state-warningBg p-4 text-sm text-state-warning">
                  Your login isn&apos;t linked to an employee record, so balances and requests can&apos;t be shown yet — ask an admin to link it in Users.
                </div>
              )}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {leaveTypes.slice(0, 3).map((t) => {
                  const used = myRequests.filter((r) => one(r.leave_type_defaults)?.name === t.name && r.status === "Approved").reduce((sum, r) => sum + r.days, 0);
                  return (
                    <div key={t.id} className="rounded-card border border-surface-border bg-white p-4">
                      <p className="text-xs text-ink-soft">{t.name}</p>
                      <p className="mt-1 font-display text-2xl font-medium text-ink">{t.configured_days - used}<span className="text-sm font-normal text-ink-soft"> / {t.configured_days} days left</span></p>
                    </div>
                  );
                })}
              </div>

              <div className="mb-3 flex justify-end">
                <button onClick={() => setView("apply")} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Apply for leave</button>
              </div>

              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {myRequests.map((r) => (
                      <tr key={r.id} className="border-t border-surface-border">
                        <td className="px-4 py-3 font-medium text-ink">{one(r.leave_type_defaults)?.name}</td>
                        <td className="px-4 py-3 text-ink-muted">{r.from_date}</td>
                        <td className="px-4 py-3 text-ink-muted">{r.to_date}</td>
                        <td className="px-4 py-3 text-ink-muted">{r.days}</td>
                        <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[r.status])}>{r.status}</span></td>
                        <td className="px-4 py-3 text-right">{r.status === "Pending" && <button onClick={() => cancel(r.id)} className="text-xs font-medium text-state-danger hover:underline">Cancel</button>}</td>
                      </tr>
                    ))}
                    {myRequests.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "leavelist" && (
            <LeaveListView requests={requests} leaveTypes={leaveTypes} departments={departments} onDecide={decide} />
          )}

          {view === "assign" && (
            <div>
              <p className="mb-3 max-w-2xl text-sm text-ink-muted">For manager-recorded leave that doesn&apos;t need approval — e.g. backdating an already-agreed absence.</p>
              <button onClick={() => setAssigning(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Assign leave</button>
            </div>
          )}

          {view === "entitlements-add" && (
            <AddEntitlementView employees={employees} leaveTypes={leaveTypes} onSaved={load} />
          )}
          {view === "entitlements-employee" && (
            <EmployeeEntitlementsView employees={employees} leaveTypes={leaveTypes} entitlements={entitlements} onSaved={load} />
          )}
          {view === "entitlements-my" && (
            <MyEntitlementsView myEmployeeId={myEmployeeId} leaveTypes={leaveTypes} entitlements={entitlements} />
          )}

          {view === "reports-usage" && (
            <UsageReportView employees={employees} leaveTypes={leaveTypes} entitlements={entitlements} requests={requests} />
          )}
          {view === "reports-my-usage" && (
            <UsageReportView employees={employees.filter((e) => e.id === myEmployeeId)} leaveTypes={leaveTypes} entitlements={entitlements} requests={requests} />
          )}

          {view === "configure-period" && <NotBuilt note="defining fiscal/leave-year start and end dates." />}
          {view === "configure-types" && (
            <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
              Leave types and their statutory minimums are configured in{" "}
              <a href="/admin/compliance?tab=leave" className="text-brand-700 hover:underline">Admin → Compliance → Statutory Leave Defaults</a>{" "}
              — that&apos;s the single source both this module and Compliance read from.
            </div>
          )}
          {view === "configure-workweek" && <NotBuilt note="defining which days count as the working week for day-count calculations." />}
          {view === "configure-holidays" && (
            <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
              The holiday calendar is configured in{" "}
              <a href="/admin/organization?tab=holidays" className="text-brand-700 hover:underline">Admin → Organization → Holiday Calendar</a>.
            </div>
          )}
        </div>
      )}

      {assigning && (
        <Modal title="Assign leave" onClose={() => setAssigning(false)}>
          <LeaveForm leaveTypes={leaveTypes} saving={saving} onSubmit={(e) => submitRequest(e, true)} onCancel={() => setAssigning(false)} employees={employees} />
        </Modal>
      )}
    </div>
  );
}

function LeaveForm({
  leaveTypes, onSubmit, onCancel, saving, employees, inline
}: {
  leaveTypes: LeaveTypeRow[]; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void; saving: boolean;
  employees?: EmployeeOption[]; inline?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {employees && (
        <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label>
          <select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
        </div>
      )}
      <div><label className="mb-1 block text-sm font-medium text-ink">Leave type *</label>
        <select name="leaveType" required className={inputCls}>{leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1 block text-sm font-medium text-ink">From *</label><input name="fromDate" type="date" required className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">To *</label><input name="toDate" type="date" required className={inputCls} /></div>
      </div>
      <div><label className="mb-1 block text-sm font-medium text-ink">Reason</label><textarea name="reason" rows={2} className={inputCls} /></div>
      <p className="text-xs text-ink-soft">Weekends are excluded from the day count automatically.</p>
      <div className={clsx("flex gap-2 pt-2", inline ? "justify-start" : "justify-end")}>
        {!inline && <button type="button" onClick={onCancel} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Leave List — with the full filter panel matching the reference
// ---------------------------------------------------------------------
interface LeaveListFilters {
  fromDate: string; toDate: string; status: string; leaveTypeId: string; employeeName: string; subUnit: string; includePast: boolean;
}
const EMPTY_LIST_FILTERS: LeaveListFilters = { fromDate: "", toDate: "", status: "Pending", leaveTypeId: "", employeeName: "", subUnit: "", includePast: false };

function LeaveListView({
  requests, leaveTypes, departments, onDecide
}: {
  requests: LeaveRequestRow[]; leaveTypes: LeaveTypeRow[]; departments: DepartmentOption[]; onDecide: (id: string, status: "Approved" | "Rejected") => void;
}) {
  const [filters, setFilters] = useState<LeaveListFilters>(EMPTY_LIST_FILTERS);

  const filtered = requests.filter((r) => {
    const emp = one(r.employees);
    if (filters.fromDate && r.from_date < filters.fromDate) return false;
    if (filters.toDate && r.to_date > filters.toDate) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.leaveTypeId && one(r.leave_type_defaults)?.name !== leaveTypes.find((t) => t.id === filters.leaveTypeId)?.name) return false;
    if (filters.employeeName && !(emp?.full_name ?? "").toLowerCase().includes(filters.employeeName.toLowerCase())) return false;
    if (!filters.includePast && emp?.status === "inactive") return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-white p-4">
        <h2 className="mb-3 font-display text-base font-medium text-ink">Leave List</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">From Date</label><input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">To Date</label><input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} className={inputCls} /></div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Show Leave with Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={inputCls}>
              <option value="">-- Select --</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Leave Type</label>
            <select value={filters.leaveTypeId} onChange={(e) => setFilters({ ...filters, leaveTypeId: e.target.value })} className={inputCls}>
              <option value="">-- Select --</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Employee Name</label>
            <div className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2">
              <Search size={14} className="text-ink-soft" />
              <input placeholder="Type for hints..." value={filters.employeeName} onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })} className="w-full bg-transparent text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Sub Unit</label>
            <select value={filters.subUnit} onChange={(e) => setFilters({ ...filters, subUnit: e.target.value })} className={inputCls}>
              <option value="">-- Select --</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
            <button type="button" role="switch" aria-checked={filters.includePast} onClick={() => setFilters({ ...filters, includePast: !filters.includePast })} className={clsx("h-5 w-9 rounded-full transition-colors", filters.includePast ? "bg-brand-gradient" : "bg-surface-border")}>
              <span className={clsx("block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform", filters.includePast ? "translate-x-4" : "translate-x-0.5")} />
            </button>
            Include Past Employees
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => setFilters(EMPTY_LIST_FILTERS)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{one(r.employees)?.full_name}</td>
                <td className="px-4 py-3 text-ink-muted">{one(r.leave_type_defaults)?.name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.from_date}</td>
                <td className="px-4 py-3 text-ink-muted">{r.to_date}</td>
                <td className="px-4 py-3 text-ink-muted">{r.days}</td>
                <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[r.status])}>{r.status}</span></td>
                <td className="px-4 py-3">
                  {r.status === "Pending" ? (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onDecide(r.id, "Approved")} aria-label={`Approve ${one(r.employees)?.full_name}'s request`} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button>
                      <button onClick={() => onDecide(r.id, "Rejected")} aria-label={`Reject ${one(r.employees)?.full_name}'s request`} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button>
                    </div>
                  ) : <span className="block text-right text-xs text-ink-soft">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Entitlements — Add / Employee (grid) / My
// ---------------------------------------------------------------------
function AddEntitlementView({ employees, leaveTypes, onSaved }: { employees: EmployeeOption[]; leaveTypes: LeaveTypeRow[]; onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const employeeId = String(form.get("employeeId"));
    const leaveTypeId = String(form.get("leaveTypeId"));
    const days = Number(form.get("days"));

    const { data: existing } = await supabase.from("employee_leave_entitlements").select("id").eq("employee_id", employeeId).eq("leave_type_id", leaveTypeId).single();
    if (existing) {
      await supabase.from("employee_leave_entitlements").update({ entitled_days: days }).eq("id", existing.id);
    } else {
      await supabase.from("employee_leave_entitlements").insert({ employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: days });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <div className="max-w-lg rounded-card border border-surface-border bg-white p-6">
      <h2 className="mb-4 font-display text-base font-medium text-ink">Add Entitlements</h2>
      <form onSubmit={save} className="space-y-4">
        <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Leave Type *</label><select name="leaveTypeId" required className={inputCls}>{leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Entitlement (days) *</label><input name="days" type="number" step="0.5" required className={inputCls} /></div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
          {saved && <span className="text-sm text-state-success">Saved</span>}
        </div>
      </form>
    </div>
  );
}

function EmployeeEntitlementsView({
  employees, leaveTypes, entitlements, onSaved
}: {
  employees: EmployeeOption[]; leaveTypes: LeaveTypeRow[]; entitlements: EntitlementRow[]; onSaved: () => void;
}) {
  const supabase = createClient();

  async function setValue(employeeId: string, leaveTypeId: string, value: number) {
    const existing = entitlements.find((e) => e.employee_id === employeeId && e.leave_type_id === leaveTypeId);
    if (existing) {
      await supabase.from("employee_leave_entitlements").update({ entitled_days: value }).eq("id", existing.id);
    } else {
      await supabase.from("employee_leave_entitlements").insert({ employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: value });
    }
    onSaved();
  }

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">Per-employee overrides — leave blank to use the org-wide default.</p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Employee</th>{leaveTypes.map((t) => <th key={t.id} className="px-4 py-3">{t.name}</th>)}</tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{emp.full_name}</td>
                {leaveTypes.map((t) => {
                  const existing = entitlements.find((e) => e.employee_id === emp.id && e.leave_type_id === t.id);
                  return (
                    <td key={t.id} className="px-4 py-3">
                      <input
                        type="number"
                        placeholder={String(t.configured_days)}
                        defaultValue={existing?.entitled_days ?? ""}
                        onBlur={(e) => e.target.value && setValue(emp.id, t.id, Number(e.target.value))}
                        className="w-20 rounded-md border border-surface-border px-2 py-1 text-sm"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyEntitlementsView({ myEmployeeId, leaveTypes, entitlements }: { myEmployeeId: string | null; leaveTypes: LeaveTypeRow[]; entitlements: EntitlementRow[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Entitlement (days)</th></tr></thead>
        <tbody>
          {leaveTypes.map((t) => {
            const existing = entitlements.find((e) => e.employee_id === myEmployeeId && e.leave_type_id === t.id);
            return (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3 text-ink-muted">{existing?.entitled_days ?? t.configured_days} <span className="text-xs text-ink-soft">{existing ? "" : "(org default)"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------
// Reports — Entitlements and Usage
// ---------------------------------------------------------------------
function UsageReportView({
  employees, leaveTypes, entitlements, requests
}: {
  employees: EmployeeOption[]; leaveTypes: LeaveTypeRow[]; entitlements: EntitlementRow[]; requests: LeaveRequestRow[];
}) {
  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Entitlement</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Balance</th></tr></thead>
        <tbody>
          {employees.flatMap((emp) =>
            leaveTypes.map((t) => {
              const entitled = entitlements.find((e) => e.employee_id === emp.id && e.leave_type_id === t.id)?.entitled_days ?? t.configured_days;
              const used = requests.filter((r) => r.employee_id === emp.id && one(r.leave_type_defaults)?.name === t.name && r.status === "Approved").reduce((sum, r) => sum + r.days, 0);
              return (
                <tr key={`${emp.id}-${t.id}`} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{emp.full_name}</td>
                  <td className="px-4 py-3 text-ink-muted">{t.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{entitled}</td>
                  <td className="px-4 py-3 text-ink-muted">{used}</td>
                  <td className="px-4 py-3 text-ink-muted">{entitled - used}</td>
                </tr>
              );
            })
          )}
          {employees.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={null}>
      <LeavePageInner />
    </Suspense>
  );
}

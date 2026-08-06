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
interface EmployeeOption { id: string; full_name: string; department_id: string | null; location_id: string | null; job_title: string | null }
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
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
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

    const [typesRes, requestsRes, employeesRes, deptRes, entRes, locRes] = await Promise.all([
      supabase.from("leave_type_defaults").select("id, name, configured_days").order("name"),
      supabase.from("leave_requests").select("id, from_date, to_date, days, status, reason, created_at, employee_id, employees(full_name, department_id, status), leave_type_defaults(name)").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name, department_id, location_id, job_title").order("full_name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("employee_leave_entitlements").select("id, employee_id, leave_type_id, entitled_days"),
      supabase.from("locations").select("id, name").order("name")
    ]);
    setLeaveTypes((typesRes.data as LeaveTypeRow[]) ?? []);
    setRequests((requestsRes.data as unknown as LeaveRequestRow[]) ?? []);
    setEmployees((employeesRes.data as EmployeeOption[]) ?? []);
    setDepartments((deptRes.data as DepartmentOption[]) ?? []);
    setEntitlements((entRes.data as EntitlementRow[]) ?? []);
    setLocations(locRes.data ?? []);
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
            <AddEntitlementView employees={employees} leaveTypes={leaveTypes} departments={departments} locations={locations} onSaved={load} />
          )}
          {view === "entitlements-employee" && (
            <EmployeeEntitlementsView employees={employees} leaveTypes={leaveTypes} entitlements={entitlements} onSaved={load} />
          )}
          {view === "entitlements-my" && (
            <MyEntitlementsView myEmployeeId={myEmployeeId} leaveTypes={leaveTypes} entitlements={entitlements} />
          )}

          {view === "reports-usage" && (
            <LeaveUsageReportView employees={employees} leaveTypes={leaveTypes} departments={departments} entitlements={entitlements} requests={requests} />
          )}
          {view === "reports-my-usage" && (
            <MyLeaveUsageReportView myEmployeeId={myEmployeeId} leaveTypes={leaveTypes} entitlements={entitlements} requests={requests} />
          )}

          {view === "configure-period" && <LeavePeriodView />}
          {view === "configure-types" && <LeaveTypeView onSaved={load} />}
          {view === "configure-workweek" && <WorkWeekView />}
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
          <LeaveForm leaveTypes={leaveTypes} saving={saving} onSubmit={(e) => submitRequest(e, true)} onCancel={() => setAssigning(false)} employees={employees} entitlements={entitlements} requests={requests} />
        </Modal>
      )}
    </div>
  );
}

function LeaveForm({
  leaveTypes, onSubmit, onCancel, saving, employees, inline, entitlements, requests
}: {
  leaveTypes: LeaveTypeRow[]; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void; saving: boolean;
  employees?: EmployeeOption[]; inline?: boolean; entitlements?: EntitlementRow[]; requests?: LeaveRequestRow[];
}) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const balance = (() => {
    if (!employees || !entitlements || !requests || !selectedEmployee || !selectedType) return null;
    const type = leaveTypes.find((t) => t.id === selectedType);
    if (!type) return null;
    const entitled = entitlements.find((e) => e.employee_id === selectedEmployee && e.leave_type_id === selectedType)?.entitled_days ?? type.configured_days;
    const used = requests
      .filter((r) => r.employee_id === selectedEmployee && one(r.leave_type_defaults)?.name === type.name && r.status === "Approved")
      .reduce((sum, r) => sum + r.days, 0);
    return entitled - used;
  })();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {employees && (
        <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label>
          <select name="employeeId" required value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className={inputCls}>
            <option value="" disabled>Select an employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
      )}
      <div><label className="mb-1 block text-sm font-medium text-ink">Leave type *</label>
        <select name="leaveType" required value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={inputCls}>
          <option value="" disabled>Select a leave type</option>
          {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {balance !== null && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">Leave Balance: <span className="font-medium">{balance} day(s)</span></p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1 block text-sm font-medium text-ink">From *</label><input name="fromDate" type="date" required className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">To *</label><input name="toDate" type="date" required className={inputCls} /></div>
      </div>
      <div><label className="mb-1 block text-sm font-medium text-ink">{employees ? "Comments" : "Reason"}</label><textarea name="reason" rows={2} className={inputCls} /></div>
      <p className="text-xs text-ink-soft">Weekends are excluded from the day count automatically.</p>
      <div className={clsx("flex gap-2 pt-2", inline ? "justify-start" : "justify-end")}>
        {!inline && <button type="button" onClick={onCancel} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} {employees ? "Assign" : "Submit"}</button>
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
    if (filters.subUnit && emp?.department_id !== filters.subUnit) return false;
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
function AddEntitlementView({
  employees, leaveTypes, departments, locations, onSaved
}: {
  employees: EmployeeOption[]; leaveTypes: LeaveTypeRow[]; departments: DepartmentOption[]; locations: { id: string; name: string }[]; onSaved: () => void;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [assignMode, setAssignMode] = useState<"individual" | "multiple">("individual");

  async function upsertOne(employeeId: string, leaveTypeId: string, days: number) {
    const { data: existing } = await supabase.from("employee_leave_entitlements").select("id").eq("employee_id", employeeId).eq("leave_type_id", leaveTypeId).single();
    if (existing) {
      await supabase.from("employee_leave_entitlements").update({ entitled_days: days }).eq("id", existing.id);
    } else {
      await supabase.from("employee_leave_entitlements").insert({ employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: days });
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const leaveTypeId = String(form.get("leaveTypeId"));
    const days = Number(form.get("days"));

    if (assignMode === "individual") {
      await upsertOne(String(form.get("employeeId")), leaveTypeId, days);
    } else {
      // Multiple — apply to everyone matching the Location/Sub Unit
      // filters (both optional; leaving both blank applies to everyone).
      const locationId = String(form.get("locationId") || "");
      const subUnitId = String(form.get("subUnitId") || "");
      const targets = employees.filter((emp) => {
        if (subUnitId && emp.department_id !== subUnitId) return false;
        if (locationId && emp.location_id !== locationId) return false;
        return true;
      });
      await Promise.all(targets.map((t) => upsertOne(t.id, leaveTypeId, days)));
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
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Assign to</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="assignMode" checked={assignMode === "individual"} onChange={() => setAssignMode("individual")} /> Individual Employee</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="assignMode" checked={assignMode === "multiple"} onChange={() => setAssignMode("multiple")} /> Multiple Employees</label>
          </div>
        </div>

        {assignMode === "individual" ? (
          <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 rounded-md bg-surface-subtle p-3">
            <div><label className="mb-1 block text-sm font-medium text-ink">Location</label><select name="locationId" className={inputCls}><option value="">All locations</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Sub Unit</label><select name="subUnitId" className={inputCls}><option value="">All sub units</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          </div>
        )}

        <div><label className="mb-1 block text-sm font-medium text-ink">Leave Type *</label><select name="leaveTypeId" required className={inputCls}>{leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>

        <div className="rounded-md border border-surface-border p-3">
          <label className="mb-1 block text-sm font-medium text-ink">Leave Period *</label>
          <div className="grid grid-cols-2 gap-3">
            <input name="periodFrom" type="date" required className={inputCls} />
            <input name="periodTo" type="date" required className={inputCls} />
          </div>
        </div>

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
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  async function setValue(employeeId: string, leaveTypeId: string, value: number) {
    const existing = entitlements.find((e) => e.employee_id === employeeId && e.leave_type_id === leaveTypeId);
    if (existing) {
      await supabase.from("employee_leave_entitlements").update({ entitled_days: value }).eq("id", existing.id);
    } else {
      await supabase.from("employee_leave_entitlements").insert({ employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: value });
    }
    onSaved();
  }

  const visibleTypes = typeFilter ? leaveTypes.filter((t) => t.id === typeFilter) : leaveTypes;
  const visibleEmployees = employees.filter((e) => e.full_name.toLowerCase().includes(nameFilter.toLowerCase()));

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2">
            <Search size={14} className="text-ink-soft" />
            <input placeholder="Employee Name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="w-full bg-transparent text-sm focus:outline-none" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="">All leave types</option>
            {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} placeholder="Leave Period from" className={inputCls} />
          <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} placeholder="Leave Period to" className={inputCls} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">Leave Period filters the visible date range for reference — entitlements themselves aren&apos;t period-scoped yet.</p>
      </div>

      <p className="mb-3 max-w-2xl text-sm text-ink-muted">Per-employee overrides — leave blank to use the org-wide default.</p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Employee</th>{visibleTypes.map((t) => <th key={t.id} className="px-4 py-3">{t.name}</th>)}</tr>
          </thead>
          <tbody>
            {visibleEmployees.map((emp) => (
              <tr key={emp.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{emp.full_name}</td>
                {visibleTypes.map((t) => {
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
            {visibleEmployees.length === 0 && <tr><td colSpan={visibleTypes.length + 1} className="px-4 py-10 text-center text-sm text-ink-soft">No matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyEntitlementsView({ myEmployeeId, leaveTypes, entitlements }: { myEmployeeId: string | null; leaveTypes: LeaveTypeRow[]; entitlements: EntitlementRow[] }) {
  const rows = leaveTypes.map((t) => {
    const existing = entitlements.find((e) => e.employee_id === myEmployeeId && e.leave_type_id === t.id);
    return { name: t.name, days: existing?.entitled_days ?? t.configured_days, isDefault: !existing };
  });
  const total = rows.reduce((sum, r) => sum + r.days, 0);

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-brand-50 p-4">
        <p className="text-xs text-brand-700">Total leave due</p>
        <p className="font-display text-2xl font-medium text-brand-700">{total.toFixed(2)} Day(s)</p>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Entitlement (days)</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.days} <span className="text-xs text-ink-soft">{r.isDefault ? "(org default)" : ""}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Reports — Leave Entitlements and Usage Report
// ---------------------------------------------------------------------
function LeaveUsageReportView({
  employees, leaveTypes, departments, entitlements, requests
}: {
  employees: EmployeeOption[]; leaveTypes: LeaveTypeRow[]; departments: DepartmentOption[]; entitlements: EntitlementRow[]; requests: LeaveRequestRow[];
}) {
  const [generateFor, setGenerateFor] = useState<"type" | "employee">("type");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [subUnit, setSubUnit] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [generated, setGenerated] = useState(false);

  const jobTitles = [...new Set(employees.map((e) => e.job_title).filter(Boolean))] as string[];

  const rows = employees
    .filter((emp) => !subUnit || emp.department_id === subUnit)
    .filter((emp) => !jobTitle || emp.job_title === jobTitle)
    .flatMap((emp) =>
      (leaveTypeId ? leaveTypes.filter((t) => t.id === leaveTypeId) : leaveTypes).map((t) => {
        const entitled = entitlements.find((e) => e.employee_id === emp.id && e.leave_type_id === t.id)?.entitled_days ?? t.configured_days;
        const relevant = requests.filter((r) => {
          if (r.employee_id !== emp.id || one(r.leave_type_defaults)?.name !== t.name) return false;
          if (periodFrom && r.from_date < periodFrom) return false;
          if (periodTo && r.to_date > periodTo) return false;
          return true;
        });
        const taken = relevant.filter((r) => r.status === "Approved").reduce((sum, r) => sum + r.days, 0);
        const pendingApproval = relevant.filter((r) => r.status === "Pending").reduce((sum, r) => sum + r.days, 0);
        return { employee: emp.full_name, type: t.name, entitled, taken, pendingApproval, balance: entitled - taken };
      })
    );

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-white p-4">
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-ink">Generate for</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" checked={generateFor === "type"} onChange={() => setGenerateFor("type")} /> Leave Type</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={generateFor === "employee"} onChange={() => setGenerateFor("employee")} /> Employee</label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} className={inputCls}>
            <option value="">All leave types</option>
            {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="rounded-md border border-surface-border p-2">
            <label className="mb-1 block text-xs font-medium text-ink">Leave Period *</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={inputCls} />
              <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <select className={inputCls} disabled><option>All locations</option></select>
          <select value={subUnit} onChange={(e) => setSubUnit(e.target.value)} className={inputCls}>
            <option value="">All sub units</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls}>
            <option value="">All job titles</option>
            {jobTitles.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <label className="flex items-center gap-2 self-center text-sm text-ink">
            <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} /> Include past employees
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => setGenerated(true)} className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Generate</button>
        </div>
      </div>

      {generated && (
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Entitlement</th><th className="px-4 py-3">Taken</th><th className="px-4 py-3">Pending Approval</th><th className="px-4 py-3">Balance</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{r.employee}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.type}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.entitled}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.taken}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.pendingApproval}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.balance}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
            </tbody>
          </table>
          <p className="border-t border-surface-border px-4 py-2 text-xs text-ink-soft">Location filter shown for reference — employees.location_id isn&apos;t cross-checked here yet, only Sub Unit is.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Reports — My Leave Entitlements and Usage Report
// ---------------------------------------------------------------------
function MyLeaveUsageReportView({
  myEmployeeId, leaveTypes, entitlements, requests
}: {
  myEmployeeId: string | null; leaveTypes: LeaveTypeRow[]; entitlements: EntitlementRow[]; requests: LeaveRequestRow[];
}) {
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [generated, setGenerated] = useState(false);

  const rows = leaveTypes.map((t) => {
    const entitled = entitlements.find((e) => e.employee_id === myEmployeeId && e.leave_type_id === t.id)?.entitled_days ?? t.configured_days;
    const relevant = requests.filter((r) => {
      if (r.employee_id !== myEmployeeId || one(r.leave_type_defaults)?.name !== t.name) return false;
      if (periodFrom && r.from_date < periodFrom) return false;
      if (periodTo && r.to_date > periodTo) return false;
      return true;
    });
    const taken = relevant.filter((r) => r.status === "Approved" && r.to_date < new Date().toISOString().slice(0, 10)).reduce((sum, r) => sum + r.days, 0);
    const scheduled = relevant.filter((r) => r.status === "Approved" && r.to_date >= new Date().toISOString().slice(0, 10)).reduce((sum, r) => sum + r.days, 0);
    const pendingApproval = relevant.filter((r) => r.status === "Pending").reduce((sum, r) => sum + r.days, 0);
    return { type: t.name, entitled, pendingApproval, scheduled, taken, balance: entitled - taken - scheduled };
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-surface-border bg-white p-4">
        <div className="rounded-md border border-surface-border p-2">
          <label className="mb-1 block text-xs font-medium text-ink">Leave Period *</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={inputCls} />
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={inputCls} />
          </div>
        </div>
        <button onClick={() => setGenerated(true)} className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Generate</button>
      </div>

      {generated && (
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Leave Entitlement</th>
                <th className="px-4 py-3">Leave Pending Approval</th>
                <th className="px-4 py-3">Leave Scheduled (Days)</th>
                <th className="px-4 py-3">Leave Taken (Days)</th>
                <th className="px-4 py-3">Leave Balance (Days)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.type} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{r.type}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.entitled}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.pendingApproval}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.scheduled}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.taken}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-surface-border px-4 py-2 text-xs text-ink-soft">
            &quot;Leave Pending&quot; and &quot;Leave Pending Approval&quot; from the spec are combined into one column here — both
            describe the same underlying Pending-status days in this data model, so showing two identical numbers under
            different names would be misleading rather than genuinely distinct.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Configure → Leave Period
// ---------------------------------------------------------------------
function LeavePeriodView() {
  const supabase = createClient();
  const [periods, setPeriods] = useState<{ id: string; start_month: string; start_date: string; end_date: string | null; is_current: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("leave_periods").select("id, start_month, start_date, end_date, is_current").order("start_date", { ascending: false });
    setPeriods(data ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("leave_periods").insert({
      start_month: form.get("startMonth"), start_date: form.get("startDate"), end_date: form.get("endDate") || null,
      is_current: form.get("currentPeriod") === "on"
    });
    setSaving(false);
    (e.target as HTMLFormElement).reset();
    load();
  }

  return (
    <div className="max-w-lg space-y-4">
      <form onSubmit={save} className="rounded-card border border-surface-border bg-white p-6">
        <h2 className="mb-4 font-display text-base font-medium text-ink">Leave Period</h2>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Start Month *</label><input name="startMonth" required placeholder="January" className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Start Date *</label><input name="startDate" type="date" required className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">End Date</label><input name="endDate" type="date" className={inputCls} /></div>
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="currentPeriod" /> Current Leave Period</label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
          <button type="reset" className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
        </div>
      </form>

      {periods.length > 0 && (
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          {periods.map((p, i) => (
            <div key={p.id} className={clsx("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
              <span className="text-ink">{p.start_month} {p.start_date} {p.end_date ? `– ${p.end_date}` : ""}</span>
              {p.is_current && <span className="rounded-full bg-state-successBg px-2 py-0.5 text-xs font-medium text-state-success">Current</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkWeekView() {
  const supabase = createClient();
  const [days, setDays] = useState<{ day: string; day_type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const { data } = await supabase.from("work_week_settings").select("day, day_type");
    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    setDays((data ?? []).sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day)));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function setDayType(day: string, dayType: string) {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, day_type: dayType } : d)));
  }

  async function saveAll() {
    setSaving(true);
    await Promise.all(days.map((d) => supabase.from("work_week_settings").update({ day_type: d.day_type }).eq("day", d.day)));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="max-w-lg rounded-card border border-surface-border bg-white p-6">
      <h2 className="mb-4 font-display text-base font-medium text-ink">Work Week</h2>
      <div className="space-y-3">
        {days.map((d) => (
          <div key={d.day} className="flex items-center justify-between">
            <span className="text-sm text-ink">{d.day}</span>
            <select value={d.day_type} onChange={(e) => setDayType(d.day, e.target.value)} className={inputCls + " w-40"}>
              <option value="Full Day">Full Day</option>
              <option value="Half Day">Half Day</option>
              <option value="Non-Working Day">Non-Working Day</option>
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
        <button onClick={load} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
        {saved && <span className="text-sm text-state-success">Saved</span>}
      </div>
    </div>
  );
}

function LeaveTypeView({ onSaved }: { onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("leave_type_defaults").insert({
      name: form.get("name"),
      statutory_minimum_days: 0,
      configured_days: 0,
      is_situational: form.get("situational") === "yes"
    });
    setSaving(false);
    if (error) {
      alert(error.message.includes("duplicate") ? `"${form.get("name")}" already exists.` : error.message);
      return;
    }
    (e.target as HTMLFormElement).reset();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <div className="max-w-lg space-y-4">
      <form onSubmit={save} className="rounded-card border border-surface-border bg-white p-6">
        <h2 className="mb-4 font-display text-base font-medium text-ink">Add Leave Type</h2>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Is Entitlement Situational?</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name="situational" value="yes" /> Yes</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="situational" value="no" defaultChecked /> No</label>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Situational entitlements (e.g. Compassionate Leave) are granted case-by-case when the situation arises,
              rather than accrued automatically like Annual or Sick Leave.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
          <button type="reset" className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
          {saved && <span className="text-sm text-state-success">Saved</span>}
        </div>
      </form>
      <p className="text-xs text-ink-soft">
        Statutory minimums for existing types are set in{" "}
        <a href="/admin/compliance?tab=leave" className="text-brand-700 hover:underline">Admin → Compliance → Statutory Leave Defaults</a>.
      </p>
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

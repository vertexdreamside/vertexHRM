"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ListChecks, UserPlus, Plus, Check, X as XIcon, Wallet2, Settings2, FileBarChart, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { key: "myleave", label: "My Leave", icon: CalendarDays },
  { key: "leavelist", label: "Leave List", icon: ListChecks },
  { key: "assign", label: "Assign Leave", icon: UserPlus },
  { key: "entitlements", label: "Entitlements", icon: Wallet2 },
  { key: "configure", label: "Configure", icon: Settings2 },
  { key: "reports", label: "Reports", icon: FileBarChart }
] as const;

type TabKey = (typeof TABS)[number]["key"];

const statusStyles: Record<string, string> = {
  Pending: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger",
  Cancelled: "bg-surface-subtle text-ink-soft"
};

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

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

interface LeaveTypeRow { id: string; name: string; configured_days: number }
interface LeaveRequestRow {
  id: string; from_date: string; to_date: string; days: number; status: string; reason: string | null; created_at: string;
  employee_id: string;
  employees: { full_name: string } | { full_name: string }[] | null;
  leave_type_defaults: { name: string } | { name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function LeavePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "myleave");
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
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

    const [typesRes, requestsRes, employeesRes] = await Promise.all([
      supabase.from("leave_type_defaults").select("id, name, configured_days").order("name"),
      supabase.from("leave_requests").select("id, from_date, to_date, days, status, reason, created_at, employee_id, employees(full_name), leave_type_defaults(name)").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name").order("full_name")
    ]);
    setLeaveTypes((typesRes.data as LeaveTypeRow[]) ?? []);
    setRequests((requestsRes.data as LeaveRequestRow[]) ?? []);
    setEmployees(employeesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (searchParams.get("apply") === "1") setApplying(true);
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

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="mt-6">
          {activeTab === "myleave" && (
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
                <button onClick={() => setApplying(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Apply for leave</button>
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
                    {myRequests.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No leave requests yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "leavelist" && (
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
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
                            <button onClick={() => decide(r.id, "Approved")} aria-label={`Approve ${one(r.employees)?.full_name}'s request`} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button>
                            <button onClick={() => decide(r.id, "Rejected")} aria-label={`Reject ${one(r.employees)?.full_name}'s request`} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button>
                          </div>
                        ) : <span className="block text-right text-xs text-ink-soft">—</span>}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">No leave requests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "assign" && (
            <div>
              <p className="mb-3 max-w-2xl text-sm text-ink-muted">For manager-recorded leave that doesn&apos;t need approval — e.g. backdating an already-agreed absence.</p>
              <button onClick={() => setAssigning(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><UserPlus size={16} /> Assign leave</button>
            </div>
          )}

          {activeTab === "entitlements" && <EntitlementsTab employees={employees} leaveTypes={leaveTypes} />}

          {activeTab === "configure" && (
            <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
              Statutory leave-type minimums and defaults are configured in{" "}
              <a href="/admin/compliance?tab=leave" className="text-brand-700 hover:underline">Admin → Compliance → Statutory Leave Defaults</a>{" "}
              — that&apos;s the single source both this module and Compliance read from.
            </div>
          )}

          {activeTab === "reports" && (
            <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
              Not built yet — leave taken by type/department and upcoming leave in the next 30 days are the natural first reports here.
            </div>
          )}
        </div>
      )}

      {applying && (
        <Modal title="Apply for leave" onClose={() => setApplying(false)}>
          <LeaveForm leaveTypes={leaveTypes} saving={saving} onSubmit={(e) => submitRequest(e, false)} onCancel={() => setApplying(false)} />
        </Modal>
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
  leaveTypes, onSubmit, onCancel, saving, employees
}: {
  leaveTypes: LeaveTypeRow[]; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onCancel: () => void; saving: boolean;
  employees?: { id: string; full_name: string }[];
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
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button>
      </div>
    </form>
  );
}

interface EntitlementRow { id: string; employee_id: string; leave_type_id: string; entitled_days: number }

function EntitlementsTab({ employees, leaveTypes }: { employees: { id: string; full_name: string }[]; leaveTypes: LeaveTypeRow[] }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("employee_leave_entitlements").select("id, employee_id, leave_type_id, entitled_days");
    setEntitlements((data as EntitlementRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function setValue(employeeId: string, leaveTypeId: string, value: number) {
    const existing = entitlements.find((e) => e.employee_id === employeeId && e.leave_type_id === leaveTypeId);
    if (existing) {
      setEntitlements((prev) => prev.map((e) => (e.id === existing.id ? { ...e, entitled_days: value } : e)));
      await supabase.from("employee_leave_entitlements").update({ entitled_days: value }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("employee_leave_entitlements").insert({ employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: value }).select("id").single();
      if (data) setEntitlements((prev) => [...prev, { id: data.id, employee_id: employeeId, leave_type_id: leaveTypeId, entitled_days: value }]);
    }
  }

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">
        Per-employee overrides — leave blank to use the org-wide default from Compliance §6.4.
      </p>
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

export default function LeavePage() {
  return (
    <Suspense fallback={null}>
      <LeavePageInner />
    </Suspense>
  );
}

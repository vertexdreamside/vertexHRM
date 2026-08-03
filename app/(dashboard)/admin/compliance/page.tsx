"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, CalendarClock, Plane, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { key: "dataprotection", label: "Data Protection", icon: ShieldAlert },
  { key: "leave", label: "Statutory Leave Defaults", icon: CalendarClock },
  { key: "permits", label: "Work Permits (GOP)", icon: Plane }
] as const;

type TabKey = (typeof TABS)[number]["key"];

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function CompliancePageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "dataprotection");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Compliance &amp; Statutory Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Seychelles Data Protection Act 2023 controls, and statutory minimums from the Employment (Conditions of
        Employment) Regulations, 1991 — live from Supabase. Engineering guidance, not legal advice.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "dataprotection" && <DataProtectionTab />}
        {activeTab === "leave" && <LeaveDefaultsTab />}
        {activeTab === "permits" && <WorkPermitsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 6.1 Data Protection
// ---------------------------------------------------------------------
interface RetentionRule { id: string; data_category: string; retention_years: number; action_after_expiry: string }
interface DataSubjectRequest { id: string; request_type: string; status: string; due_date: string | null; employees: { full_name: string } | { full_name: string }[] | null }
interface BreachSettings { notify_emails: string[]; dpo_name: string | null; dpo_contact: string | null }

function DataProtectionTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<RetentionRule[]>([]);
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [breach, setBreach] = useState<BreachSettings | null>(null);
  const [addingRule, setAddingRule] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [savingBreach, setSavingBreach] = useState(false);

  async function load() {
    setLoading(true);
    const [rulesRes, requestsRes, breachRes] = await Promise.all([
      supabase.from("data_retention_rules").select("id, data_category, retention_years, action_after_expiry").order("data_category"),
      supabase.from("data_subject_requests").select("id, request_type, status, due_date, employees(full_name)").order("due_date"),
      supabase.from("breach_notification_settings").select("notify_emails, dpo_name, dpo_contact").eq("id", true).single()
    ]);
    setRules((rulesRes.data as RetentionRule[]) ?? []);
    setRequests((requestsRes.data as DataSubjectRequest[]) ?? []);
    setBreach(breachRes.data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function saveRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingRule(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("data_retention_rules").insert({
      data_category: form.get("dataCategory"),
      retention_years: Number(form.get("retentionYears")),
      action_after_expiry: form.get("actionAfterExpiry")
    });
    setSavingRule(false);
    setAddingRule(false);
    load();
  }

  async function saveBreach() {
    if (!breach) return;
    setSavingBreach(true);
    await supabase.from("breach_notification_settings").update(breach).eq("id", true);
    setSavingBreach(false);
  }

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-ink">Data retention policy</h2>
          <button onClick={() => setAddingRule(true)} className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"><Plus size={14} /> Add rule</button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Data category</th><th className="px-4 py-3">Retention period</th><th className="px-4 py-3">Action after expiry</th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-surface-border"><td className="px-4 py-3 font-medium text-ink">{r.data_category}</td><td className="px-4 py-3 text-ink-muted">{r.retention_years} years</td><td className="px-4 py-3 text-ink-muted">{r.action_after_expiry}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-medium text-ink">Data subject request log</h2>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Request type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due date</th></tr></thead>
            <tbody>
              {requests.map((r) => {
                const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees;
                return (
                  <tr key={r.id} className="border-t border-surface-border"><td className="px-4 py-3 font-medium text-ink">{emp?.full_name ?? "—"}</td><td className="px-4 py-3 text-ink-muted">{r.request_type}</td><td className="px-4 py-3 text-ink-muted">{r.status}</td><td className="px-4 py-3 text-ink-muted">{r.due_date ?? "—"}</td></tr>
                );
              })}
              {requests.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No access, rectification, or erasure requests on file.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {breach && (
        <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6">
          <h2 className="font-display text-base font-medium text-ink">Breach notification</h2>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-ink">Notify these addresses if a suspected breach is flagged</label>
            <input
              className={inputCls}
              placeholder="admin@vertexhrm.app, dpo@vertexhrm.app"
              value={breach.notify_emails?.join(", ") ?? ""}
              onChange={(e) => setBreach({ ...breach, notify_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
          <button onClick={saveBreach} disabled={savingBreach} className="mt-4 flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {savingBreach && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      )}

      {addingRule && (
        <Modal title="Add retention rule" onClose={() => setAddingRule(false)}>
          <form onSubmit={saveRule} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Data category *</label><input name="dataCategory" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Retention period (years) *</label><input name="retentionYears" type="number" required className={inputCls} /></div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Action after expiry *</label>
              <select name="actionAfterExpiry" required className={inputCls} defaultValue="Archive"><option value="Archive">Archive</option><option value="Anonymize">Anonymize</option><option value="Delete">Delete</option></select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingRule(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={savingRule} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{savingRule && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 6.4 Statutory Leave Defaults
// ---------------------------------------------------------------------
interface LeaveDefaultRow { id: string; name: string; statutory_minimum_days: number; configured_days: number; notes: string | null }

function LeaveDefaultsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<LeaveDefaultRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("leave_type_defaults").select("id, name, statutory_minimum_days, configured_days, notes").order("name");
    setTypes((data as LeaveDefaultRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function updateDays(id: string, value: number) {
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, configured_days: value } : t)));
    await supabase.from("leave_type_defaults").update({ configured_days: value }).eq("id", id);
  }

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Leave type</th><th className="px-4 py-3">Statutory minimum</th><th className="px-4 py-3">Configured days</th><th className="px-4 py-3">Notes</th></tr></thead>
        <tbody>
          {types.map((t) => {
            const belowMinimum = t.configured_days < t.statutory_minimum_days;
            return (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3 text-ink-muted">{t.statutory_minimum_days} days</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 rounded-md border border-surface-border px-2 py-1 text-sm" value={t.configured_days} onChange={(e) => updateDays(t.id, Number(e.target.value))} />
                    {belowMinimum && <span title="Below the statutory minimum" className="flex items-center gap-1 text-xs font-medium text-state-warning"><AlertTriangle size={14} /> Below minimum</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{t.notes || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------
// 6.5 Foreign Worker / Work Permit Tracking
// ---------------------------------------------------------------------
interface WorkPermitRow {
  id: string; nationality: string | null; gop_number: string | null; expiry_date: string; status: string;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function WorkPermitsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [permits, setPermits] = useState<WorkPermitRow[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [permitsRes, employeesRes] = await Promise.all([
      supabase.from("work_permits_with_status").select("id, nationality, gop_number, expiry_date, status, employees(full_name)").order("expiry_date"),
      supabase.from("employees").select("id, full_name").order("full_name")
    ]);
    setPermits((permitsRes.data as WorkPermitRow[]) ?? []);
    setEmployees(employeesRes.data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("work_permits").insert({
      employee_id: form.get("employeeId"),
      nationality: form.get("nationality"),
      gop_number: form.get("gopNumber"),
      expiry_date: form.get("expiryDate")
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  const statusStyles: Record<string, string> = {
    Valid: "bg-state-successBg text-state-success",
    "Pending Renewal": "bg-state-warningBg text-state-warning",
    Expired: "bg-state-dangerBg text-state-danger"
  };

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Any non-Seychellois employee needs a valid Gainful Occupation Permit — status is computed automatically from
        the expiry date (a database-generated column, so the frontend and database can never disagree on it).
      </p>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add work permit</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Nationality</th><th className="px-4 py-3">GOP number</th><th className="px-4 py-3">Expiry date</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {permits.map((p) => {
              const emp = Array.isArray(p.employees) ? p.employees[0] : p.employees;
              return (
                <tr key={p.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{emp?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.nationality}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.gop_number}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.expiry_date}</td>
                  <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[p.status])}>{p.status}</span></td>
                </tr>
              );
            })}
            {permits.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No foreign employees on file requiring a GOP.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add work permit" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Employee *</label>
              <select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Nationality *</label><input name="nationality" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">GOP number *</label><input name="gopNumber" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Expiry date *</label><input name="expiryDate" type="date" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense fallback={null}>
      <CompliancePageInner />
    </Suspense>
  );
}

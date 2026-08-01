"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, CalendarClock, Plane, Plus, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { DataRetentionRule, DataSubjectRequest, LeaveTypeDefault, WorkPermit } from "@/lib/types";

const TABS = [
  { key: "dataprotection", label: "Data Protection", icon: ShieldAlert },
  { key: "leave", label: "Statutory Leave Defaults", icon: CalendarClock },
  { key: "permits", label: "Work Permits (GOP)", icon: Plane }
] as const;

type TabKey = (typeof TABS)[number]["key"];

const inputCls =
  "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function CompliancePageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) || "dataprotection"
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Compliance &amp; Statutory Settings
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Seychelles Data Protection Act 2023 controls, and statutory
        minimums from the Employment (Conditions of Employment)
        Regulations, 1991. Engineering guidance, not legal advice — have
        these figures confirmed by counsel before go-live.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
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
function DataProtectionTab() {
  const [rules, setRules] = useState<DataRetentionRule[]>([
    { id: "1", dataCategory: "Employee Records", retentionYears: 7, actionAfterExpiry: "Archive" },
    { id: "2", dataCategory: "Payroll / Claims Records", retentionYears: 7, actionAfterExpiry: "Archive" },
    { id: "3", dataCategory: "Attachments / Documents", retentionYears: 5, actionAfterExpiry: "Delete" },
    { id: "4", dataCategory: "Audit Logs", retentionYears: 3, actionAfterExpiry: "Anonymize" }
  ]);
  const [requests] = useState<DataSubjectRequest[]>([]);
  const [addingRule, setAddingRule] = useState(false);
  const [breachEmail, setBreachEmail] = useState("");

  function saveRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        dataCategory: String(form.get("dataCategory")),
        retentionYears: Number(form.get("retentionYears")),
        actionAfterExpiry: form.get("actionAfterExpiry") as DataRetentionRule["actionAfterExpiry"]
      }
    ]);
    setAddingRule(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-ink">
            Data retention policy
          </h2>
          <button
            onClick={() => setAddingRule(true)}
            className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            <Plus size={14} /> Add rule
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Data category</th>
                <th className="px-4 py-3">Retention period</th>
                <th className="px-4 py-3">Action after expiry</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{r.dataCategory}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.retentionYears} years</td>
                  <td className="px-4 py-3 text-ink-muted">{r.actionAfterExpiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-medium text-ink">
          Data subject request log
        </h2>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Request type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due date</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">
                    No access, rectification, or erasure requests on file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">
          Breach notification
        </h2>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-ink">
            Notify these addresses if a suspected breach is flagged
          </label>
          <input
            className={inputCls}
            placeholder="admin@vertexhrm.app, dpo@vertexhrm.app"
            value={breachEmail}
            onChange={(e) => setBreachEmail(e.target.value)}
          />
        </div>
        <button className="mt-4 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Save
        </button>
      </div>

      {addingRule && (
        <Modal title="Add retention rule" onClose={() => setAddingRule(false)}>
          <form onSubmit={saveRule} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Data category *
              </label>
              <input name="dataCategory" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Retention period (years) *
              </label>
              <input name="retentionYears" type="number" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Action after expiry *
              </label>
              <select name="actionAfterExpiry" required className={inputCls} defaultValue="Archive">
                <option value="Archive">Archive</option>
                <option value="Anonymize">Anonymize</option>
                <option value="Delete">Delete</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingRule(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
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
function LeaveDefaultsTab() {
  const [types, setTypes] = useState<LeaveTypeDefault[]>([
    { id: "1", name: "Annual Leave", statutoryMinimumDays: 21, currentDays: 21, notes: "1.75 days/month accrual" },
    { id: "2", name: "Sick Leave", statutoryMinimumDays: 21, currentDays: 21, notes: "+30 days if hospitalized" },
    { id: "3", name: "Maternity Leave", statutoryMinimumDays: 98, currentDays: 98, notes: "14 weeks paid + 12 weeks unpaid" },
    { id: "4", name: "Paternity Leave", statutoryMinimumDays: 10, currentDays: 10, notes: "Consecutive working days" },
    { id: "5", name: "Compassionate Leave", statutoryMinimumDays: 4, currentDays: 4, notes: "" }
  ]);

  function updateDays(id: string, value: number) {
    setTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, currentDays: value } : t))
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Leave type</th>
            <th className="px-4 py-3">Statutory minimum</th>
            <th className="px-4 py-3">Configured days</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => {
            const belowMinimum = t.currentDays < t.statutoryMinimumDays;
            return (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {t.statutoryMinimumDays} days
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-20 rounded-md border border-surface-border px-2 py-1 text-sm"
                      value={t.currentDays}
                      onChange={(e) => updateDays(t.id, Number(e.target.value))}
                    />
                    {belowMinimum && (
                      <span
                        title="Below the statutory minimum"
                        className="flex items-center gap-1 text-xs font-medium text-state-warning"
                      >
                        <AlertTriangle size={14} /> Below minimum
                      </span>
                    )}
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
function WorkPermitsTab() {
  const [permits, setPermits] = useState<WorkPermit[]>([]);
  const [adding, setAdding] = useState(false);

  function statusFromDate(expiryDate: string): WorkPermit["status"] {
    const days = (new Date(expiryDate).getTime() - Date.now()) / 86_400_000;
    if (days < 0) return "Expired";
    if (days < 90) return "Pending Renewal";
    return "Valid";
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const expiryDate = String(form.get("expiryDate"));
    setPermits((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        employeeName: String(form.get("employeeName")),
        nationality: String(form.get("nationality")),
        gopNumber: String(form.get("gopNumber")),
        expiryDate,
        status: statusFromDate(expiryDate)
      }
    ]);
    setAdding(false);
  }

  const statusStyles: Record<WorkPermit["status"], string> = {
    Valid: "bg-state-successBg text-state-success",
    "Pending Renewal": "bg-state-warningBg text-state-warning",
    Expired: "bg-state-dangerBg text-state-danger"
  };

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Any non-Seychellois employee needs a valid Gainful Occupation
        Permit — working on an expired GOP is an offense for both
        employer and employee.
      </p>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add work permit
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Nationality</th>
              <th className="px-4 py-3">GOP number</th>
              <th className="px-4 py-3">Expiry date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {permits.map((p) => (
              <tr key={p.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{p.employeeName}</td>
                <td className="px-4 py-3 text-ink-muted">{p.nationality}</td>
                <td className="px-4 py-3 text-ink-muted">{p.gopNumber}</td>
                <td className="px-4 py-3 text-ink-muted">{p.expiryDate}</td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      statusStyles[p.status]
                    )}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {permits.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">
                  No foreign employees on file requiring a GOP.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add work permit" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Employee name *
              </label>
              <input name="employeeName" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Nationality *
              </label>
              <input name="nationality" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                GOP number *
              </label>
              <input name="gopNumber" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Expiry date *
              </label>
              <input name="expiryDate" type="date" required className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
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

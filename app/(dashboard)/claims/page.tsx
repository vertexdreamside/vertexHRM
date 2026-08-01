"use client";

import { useState } from "react";
import { Receipt, ListChecks, Settings2, Plus, Check, X as XIcon, Eye } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { Claim, ClaimEvent, ClaimExpenseType, ClaimStatus } from "@/lib/types";

const SEED_EVENTS: ClaimEvent[] = [
  { id: "1", name: "Accommodation", active: true },
  { id: "2", name: "Medical Reimbursement", active: true },
  { id: "3", name: "Travel Allowance", active: true }
];

const SEED_EXPENSE_TYPES: ClaimExpenseType[] = [
  { id: "1", name: "Accommodation", active: true },
  { id: "2", name: "Fuel Allowance", active: true },
  { id: "3", name: "Transport", active: true }
];

const SEED_CLAIMS: Claim[] = [
  {
    id: "1", referenceId: "CLM-0001", employeeName: "You", eventId: "3", currency: "SCR",
    status: "Submitted", remarks: "Client visit — Praslin", submittedDate: "2026-07-28",
    expenses: [{ id: "1", expenseTypeId: "3", date: "2026-07-27", amount: 450, note: "Ferry + taxi" }]
  },
  {
    id: "2", referenceId: "CLM-0002", employeeName: "Selvan Pillay", eventId: "2", currency: "SCR",
    status: "Submitted", remarks: "", submittedDate: "2026-07-30",
    expenses: [{ id: "1", expenseTypeId: "1", date: "2026-07-29", amount: 800, note: "Consultation" }]
  }
];

const statusStyles: Record<ClaimStatus, string> = {
  Initiated: "bg-surface-subtle text-ink-soft",
  Submitted: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger",
  Cancelled: "bg-surface-subtle text-ink-soft"
};

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function claimTotal(claim: Claim) {
  return claim.expenses.reduce((sum, e) => sum + e.amount, 0);
}

const TABS = [
  { key: "myclaims", label: "My Claims", icon: Receipt },
  { key: "employeeclaims", label: "Employee Claims", icon: ListChecks },
  { key: "configuration", label: "Configuration", icon: Settings2 }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>(SEED_CLAIMS);
  const [events, setEvents] = useState<ClaimEvent[]>(SEED_EVENTS);
  const [expenseTypes, setExpenseTypes] = useState<ClaimExpenseType[]>(SEED_EXPENSE_TYPES);
  const [activeTab, setActiveTab] = useState<TabKey>("myclaims");
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Claim | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [addingExpenseType, setAddingExpenseType] = useState(false);

  function submitClaim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newClaim: Claim = {
      id: crypto.randomUUID(),
      referenceId: `CLM-${String(claims.length + 1).padStart(4, "0")}`,
      employeeName: "You",
      eventId: String(form.get("eventId")),
      currency: String(form.get("currency")),
      status: "Submitted",
      remarks: String(form.get("remarks")),
      expenses: [],
      submittedDate: new Date().toISOString().slice(0, 10)
    };
    setClaims((prev) => [newClaim, ...prev]);
    // TODO(supabase): insert into `claims`; expense lines get added
    // afterward via the claim detail view (Add Expense), same as spec.
    setSubmitting(false);
  }

  function decide(id: string, status: "Approved" | "Rejected") {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setEvents((prev) => [...prev, { id: crypto.randomUUID(), name: String(form.get("name")), active: true }]);
    setAddingEvent(false);
  }

  function saveExpenseType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setExpenseTypes((prev) => [...prev, { id: crypto.randomUUID(), name: String(form.get("name")), active: true }]);
    setAddingExpenseType(false);
  }

  const myClaims = claims.filter((c) => c.employeeName === "You");
  const pendingClaims = claims.filter((c) => c.status === "Submitted");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Claims</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Expense claims — submit, approve, and configure the event/expense
        catalogs they draw from.
      </p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
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
        {activeTab === "myclaims" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setSubmitting(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Submit claim
              </button>
            </div>
            <ClaimsTable claims={myClaims} events={events} onView={setViewing} />
          </div>
        )}

        {activeTab === "employeeclaims" && (
          <div>
            <ClaimsTable
              claims={pendingClaims}
              events={events}
              onView={setViewing}
              onDecide={decide}
            />
          </div>
        )}

        {activeTab === "configuration" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-medium text-ink">Events</h3>
                <button
                  onClick={() => setAddingEvent(true)}
                  className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-t border-surface-border first:border-t-0">
                        <td className="px-4 py-3 text-ink">{ev.name}</td>
                        <td className="px-4 py-3 text-right text-xs text-state-success">Active</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-medium text-ink">Expense types</h3>
                <button
                  onClick={() => setAddingExpenseType(true)}
                  className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {expenseTypes.map((et) => (
                      <tr key={et.id} className="border-t border-surface-border first:border-t-0">
                        <td className="px-4 py-3 text-ink">{et.name}</td>
                        <td className="px-4 py-3 text-right text-xs text-state-success">Active</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {submitting && (
        <Modal title="Submit claim" onClose={() => setSubmitting(false)}>
          <form onSubmit={submitClaim} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Event *</label>
              <select name="eventId" required className={inputCls}>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Currency *</label>
              <select name="currency" required className={inputCls} defaultValue="SCR">
                <option value="SCR">SCR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Remarks</label>
              <textarea name="remarks" rows={2} className={inputCls} />
            </div>
            <p className="text-xs text-ink-soft">
              Add expense line items from the claim detail view after
              submitting.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitting(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingEvent && (
        <Modal title="Add event" onClose={() => setAddingEvent(false)}>
          <form onSubmit={saveEvent} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Event name *</label>
              <input name="name" required className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingEvent(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingExpenseType && (
        <Modal title="Add expense type" onClose={() => setAddingExpenseType(false)}>
          <form onSubmit={saveExpenseType} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Expense type name *</label>
              <input name="name" required className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingExpenseType(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Claim ${viewing.referenceId}`} onClose={() => setViewing(null)}>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-ink">Employee:</span> <span className="text-ink-muted">{viewing.employeeName}</span></p>
            <p><span className="font-medium text-ink">Event:</span> <span className="text-ink-muted">{events.find((e) => e.id === viewing.eventId)?.name}</span></p>
            <p><span className="font-medium text-ink">Remarks:</span> <span className="text-ink-muted">{viewing.remarks || "—"}</span></p>
            <div className="border-t border-surface-border pt-3">
              <p className="mb-2 font-medium text-ink">Expenses</p>
              {viewing.expenses.length === 0 ? (
                <p className="text-ink-soft">No expense lines added yet.</p>
              ) : (
                <ul className="space-y-1">
                  {viewing.expenses.map((exp) => (
                    <li key={exp.id} className="flex justify-between text-ink-muted">
                      <span>{expenseTypes.find((t) => t.id === exp.expenseTypeId)?.name} — {exp.date}</span>
                      <span>{viewing.currency} {exp.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-right font-medium text-ink">
                Total: {viewing.currency} {claimTotal(viewing).toLocaleString()}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClaimsTable({
  claims,
  events,
  onView,
  onDecide
}: {
  claims: Claim[];
  events: ClaimEvent[];
  onView: (c: Claim) => void;
  onDecide?: (id: string, status: "Approved" | "Rejected") => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="border-t border-surface-border">
              <td className="px-4 py-3 font-medium text-ink">{c.referenceId}</td>
              <td className="px-4 py-3 text-ink-muted">{c.employeeName}</td>
              <td className="px-4 py-3 text-ink-muted">{events.find((e) => e.id === c.eventId)?.name}</td>
              <td className="px-4 py-3 text-ink-muted">{c.submittedDate}</td>
              <td className="px-4 py-3 text-ink-muted">{c.currency} {claimTotal(c).toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[c.status])}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onView(c)} aria-label={`View ${c.referenceId}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700">
                    <Eye size={16} />
                  </button>
                  {onDecide && c.status === "Submitted" && (
                    <>
                      <button onClick={() => onDecide(c.id, "Approved")} aria-label={`Approve ${c.referenceId}`} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg">
                        <Check size={16} />
                      </button>
                      <button onClick={() => onDecide(c.id, "Rejected")} aria-label={`Reject ${c.referenceId}`} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg">
                        <XIcon size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {claims.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">No claims here.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

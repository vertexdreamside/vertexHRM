"use client";

import { useEffect, useState } from "react";
import { Receipt, ListChecks, Settings2, Plus, Check, X as XIcon, Eye, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const statusStyles: Record<string, string> = {
  Initiated: "bg-surface-subtle text-ink-soft",
  Submitted: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger",
  Cancelled: "bg-surface-subtle text-ink-soft"
};

const TABS = [
  { key: "myclaims", label: "My Claims", icon: Receipt },
  { key: "employeeclaims", label: "Employee Claims", icon: ListChecks },
  { key: "configuration", label: "Configuration", icon: Settings2 }
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface EventRow { id: string; name: string }
interface ExpenseTypeRow { id: string; name: string }
interface ExpenseLineRow { id: string; expense_type_id: string; expense_date: string; amount: number; note: string | null }
interface ClaimRow {
  id: string; reference_id: string; event_id: string; currency: string; status: string; remarks: string | null; submitted_date: string; employee_id: string;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function ClaimsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [expenseLines, setExpenseLines] = useState<Record<string, ExpenseLineRow[]>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("myclaims");
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<ClaimRow | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [addingExpenseType, setAddingExpenseType] = useState(false);
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

    const [eventsRes, typesRes, claimsRes] = await Promise.all([
      supabase.from("claim_events").select("id, name").order("name"),
      supabase.from("claim_expense_types").select("id, name").order("name"),
      supabase.from("claims").select("id, reference_id, event_id, currency, status, remarks, submitted_date, employee_id, employees(full_name)").order("submitted_date", { ascending: false })
    ]);
    setEvents((eventsRes.data as EventRow[]) ?? []);
    setExpenseTypes((typesRes.data as ExpenseTypeRow[]) ?? []);
    setClaims((claimsRes.data as ClaimRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function loadExpenseLines(claimId: string) {
    if (expenseLines[claimId]) return;
    const { data } = await supabase.from("claim_expense_lines").select("id, expense_type_id, expense_date, amount, note").eq("claim_id", claimId);
    setExpenseLines((prev) => ({ ...prev, [claimId]: (data as ExpenseLineRow[]) ?? [] }));
  }

  async function openView(claim: ClaimRow) {
    setViewing(claim);
    loadExpenseLines(claim.id);
  }

  async function submitClaim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!myEmployeeId) {
      alert("Your login isn't linked to an employee record — ask an admin to link it in Users.");
      return;
    }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const referenceId = `CLM-${String(claims.length + 1).padStart(4, "0")}`;

    const { error } = await supabase.from("claims").insert({
      reference_id: referenceId,
      employee_id: myEmployeeId,
      event_id: form.get("eventId"),
      currency: form.get("currency"),
      status: "Submitted",
      remarks: form.get("remarks")
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSubmitting(false);
    load();
  }

  async function decide(id: string, status: "Approved" | "Rejected") {
    await supabase.from("claims").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  async function saveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("claim_events").insert({ name: form.get("name") });
    setSaving(false);
    setAddingEvent(false);
    load();
  }

  async function saveExpenseType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("claim_expense_types").insert({ name: form.get("name") });
    setSaving(false);
    setAddingExpenseType(false);
    load();
  }

  function claimTotal(claimId: string) {
    return (expenseLines[claimId] ?? []).reduce((sum, e) => sum + e.amount, 0);
  }

  const myClaims = claims.filter((c) => c.employee_id === myEmployeeId);
  const pendingClaims = claims.filter((c) => c.status === "Submitted");

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Claims</h1>
      <p className="mt-1 text-sm text-ink-muted">Expense claims — live from Supabase.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "myclaims" && (
          <div>
            {!myEmployeeId && (
              <div className="mb-4 rounded-card border border-state-warning/30 bg-state-warningBg p-4 text-sm text-state-warning">
                Your login isn&apos;t linked to an employee record — ask an admin to link it in Users before submitting a claim.
              </div>
            )}
            <div className="mb-3 flex justify-end">
              <button onClick={() => setSubmitting(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Submit claim</button>
            </div>
            <ClaimsTable claims={myClaims} events={events} onView={openView} />
          </div>
        )}

        {activeTab === "employeeclaims" && <ClaimsTable claims={pendingClaims} events={events} onView={openView} onDecide={decide} />}

        {activeTab === "configuration" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-medium text-ink">Events</h3>
                <button onClick={() => setAddingEvent(true)} className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"><Plus size={14} /> Add</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                {events.map((ev, i) => <div key={ev.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{ev.name}</div>)}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-medium text-ink">Expense types</h3>
                <button onClick={() => setAddingExpenseType(true)} className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"><Plus size={14} /> Add</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                {expenseTypes.map((et, i) => <div key={et.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{et.name}</div>)}
              </div>
            </div>
          </div>
        )}
      </div>

      {submitting && (
        <Modal title="Submit claim" onClose={() => setSubmitting(false)}>
          <form onSubmit={submitClaim} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Event *</label><select name="eventId" required className={inputCls}>{events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Currency *</label><select name="currency" required className={inputCls} defaultValue="SCR"><option value="SCR">SCR</option><option value="USD">USD</option></select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Remarks</label><textarea name="remarks" rows={2} className={inputCls} /></div>
            <p className="text-xs text-ink-soft">Add expense line items from the claim detail view after submitting.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSubmitting(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button>
            </div>
          </form>
        </Modal>
      )}

      {addingEvent && (
        <Modal title="Add event" onClose={() => setAddingEvent(false)}>
          <form onSubmit={saveEvent} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Event name *</label><input name="name" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingEvent(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingExpenseType && (
        <Modal title="Add expense type" onClose={() => setAddingExpenseType(false)}>
          <form onSubmit={saveExpenseType} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Expense type name *</label><input name="name" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingExpenseType(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title={`Claim ${viewing.reference_id}`} onClose={() => setViewing(null)}>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-ink">Employee:</span> <span className="text-ink-muted">{one(viewing.employees)?.full_name}</span></p>
            <p><span className="font-medium text-ink">Event:</span> <span className="text-ink-muted">{events.find((e) => e.id === viewing.event_id)?.name}</span></p>
            <p><span className="font-medium text-ink">Remarks:</span> <span className="text-ink-muted">{viewing.remarks || "—"}</span></p>
            <div className="border-t border-surface-border pt-3">
              <p className="mb-2 font-medium text-ink">Expenses</p>
              {(expenseLines[viewing.id] ?? []).length === 0 ? (
                <p className="text-ink-soft">No expense lines added yet.</p>
              ) : (
                <ul className="space-y-1">
                  {(expenseLines[viewing.id] ?? []).map((exp) => (
                    <li key={exp.id} className="flex justify-between text-ink-muted">
                      <span>{expenseTypes.find((t) => t.id === exp.expense_type_id)?.name} — {exp.expense_date}</span>
                      <span>{viewing.currency} {exp.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-right font-medium text-ink">Total: {viewing.currency} {claimTotal(viewing.id).toLocaleString()}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClaimsTable({
  claims, events, onView, onDecide
}: {
  claims: ClaimRow[]; events: EventRow[]; onView: (c: ClaimRow) => void; onDecide?: (id: string, status: "Approved" | "Rejected") => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="border-t border-surface-border">
              <td className="px-4 py-3 font-medium text-ink">{c.reference_id}</td>
              <td className="px-4 py-3 text-ink-muted">{one(c.employees)?.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-ink-muted">{events.find((e) => e.id === c.event_id)?.name}</td>
              <td className="px-4 py-3 text-ink-muted">{c.submitted_date}</td>
              <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[c.status])}>{c.status}</span></td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onView(c)} aria-label={`View ${c.reference_id}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Eye size={16} /></button>
                  {onDecide && c.status === "Submitted" && (
                    <>
                      <button onClick={() => onDecide(c.id, "Approved")} aria-label={`Approve ${c.reference_id}`} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button>
                      <button onClick={() => onDecide(c.id, "Rejected")} aria-label={`Reject ${c.reference_id}`} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {claims.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No claims here.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

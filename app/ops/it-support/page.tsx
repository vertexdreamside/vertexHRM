"use client";

import { useEffect, useState } from "react";
import { Wrench, Plus, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const statusStyles: Record<string, string> = {
  Open: "bg-state-warningBg text-state-warning", "In Progress": "bg-brand-50 text-brand-700",
  Resolved: "bg-state-successBg text-state-success", Closed: "bg-surface-subtle text-ink-soft"
};
const priorityStyles: Record<string, string> = {
  Low: "text-ink-soft", Medium: "text-ink-muted", High: "text-state-warning", Urgent: "text-state-danger"
};

function one<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }

interface CategoryRow { id: string; name: string }
interface TicketRow {
  id: string; subject: string; description: string | null; priority: string; status: string; created_at: string; requested_by: string;
  employees: { full_name: string } | { full_name: string }[] | null;
  it_ticket_categories: { name: string } | { name: string }[] | null;
}

export default function ItSupportPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      setMyEmployeeId(appUser?.employee_id ?? null);
    }
    const [catRes, ticketRes] = await Promise.all([
      supabase.from("it_ticket_categories").select("id, name").order("name"),
      supabase.from("it_tickets").select("id, subject, description, priority, status, created_at, requested_by, employees(full_name), it_ticket_categories(name)").order("created_at", { ascending: false })
    ]);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setTickets((ticketRes.data as unknown as TicketRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!myEmployeeId) { alert("Your login isn't linked to an employee record."); return; }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("it_tickets").insert({
      requested_by: myEmployeeId, category_id: form.get("categoryId"), subject: form.get("subject"),
      description: form.get("description"), priority: form.get("priority")
    });
    setSaving(false); setAdding(false); load();
  }

  async function updateStatus(id: string, status: string) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await supabase.from("it_tickets").update({ status }).eq("id", id);
  }

  const rows = tab === "mine" ? tickets.filter((t) => t.requested_by === myEmployeeId) : tickets;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">IT Support</h1>
      <p className="mt-1 text-sm text-ink-muted">Support tickets — live from Supabase.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        {(["mine", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === t ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <Wrench size={15} /> {t === "mine" ? "My Tickets" : "All Tickets"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "mine" && (
          <div className="mb-3 flex justify-end"><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New ticket</button></div>
        )}
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Requested by</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : rows.map((t) => (
                <tr key={t.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{one(t.employees)?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{one(t.it_ticket_categories)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{t.subject}</td>
                  <td className={clsx("px-4 py-3 font-medium", priorityStyles[t.priority])}>{t.priority}</td>
                  <td className="px-4 py-3">
                    {tab === "all" ? (
                      <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)} className={clsx("rounded-full border-0 px-2.5 py-0.5 text-xs font-medium", statusStyles[t.status])}>
                        <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option>
                      </select>
                    ) : <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[t.status])}>{t.status}</span>}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No tickets here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal title="New IT ticket" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Category *</label><select name="categoryId" required className={inputCls}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Subject *</label><input name="subject" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description</label><textarea name="description" rows={3} className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Priority</label><select name="priority" defaultValue="Medium" className={inputCls}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

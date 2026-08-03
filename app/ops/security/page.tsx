"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Check, X as XIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const statusStyles: Record<string, string> = {
  Pending: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger"
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

interface CategoryRow { id: string; name: string }
interface RequestRow {
  id: string; description: string; status: string; created_at: string; employee_id: string;
  employees: { full_name: string } | { full_name: string }[] | null;
  request_categories: { name: string } | { name: string }[] | null;
}

export default function RequestsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
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
    const [catRes, reqRes] = await Promise.all([
      supabase.from("request_categories").select("id, name").order("name"),
      supabase.from("requests").select("id, description, status, created_at, employee_id, employees(full_name), request_categories(name)").order("created_at", { ascending: false })
    ]);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setRequests((reqRes.data as unknown as RequestRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!myEmployeeId) { alert("Your login isn't linked to an employee record."); return; }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("requests").insert({ employee_id: myEmployeeId, category_id: form.get("categoryId"), description: form.get("description") });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function decide(id: string, status: "Approved" | "Rejected") {
    await supabase.from("requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  const rows = tab === "mine" ? requests.filter((r) => r.employee_id === myEmployeeId) : requests;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Requests</h1>
      <p className="mt-1 text-sm text-ink-muted">General employee requests — equipment, access, facilities.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        {(["mine", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === t ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <ClipboardList size={15} /> {t === "mine" ? "My Requests" : "All Requests"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "mine" && (
          <div className="mb-3 flex justify-end">
            <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New request</button>
          </div>
        )}
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : rows.map((r) => (
                <tr key={r.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{one(r.employees)?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{one(r.request_categories)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.description}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[r.status])}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    {tab === "all" && r.status === "Pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => decide(r.id, "Approved")} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button>
                        <button onClick={() => decide(r.id, "Rejected")} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No requests here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <Modal title="New request" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Category *</label><select name="categoryId" required className={inputCls}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description *</label><textarea name="description" required rows={3} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

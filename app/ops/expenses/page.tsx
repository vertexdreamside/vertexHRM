"use client";

import { useEffect, useState } from "react";
import { Wallet, Plus, Check, X as XIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const statusStyles: Record<string, string> = {
  Pending: "bg-state-warningBg text-state-warning", Approved: "bg-state-successBg text-state-success", Rejected: "bg-state-dangerBg text-state-danger"
};

function one<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }

interface DeptOption { id: string; name: string }
interface CategoryRow { id: string; name: string }
interface EmployeeOption { id: string; full_name: string }
interface ExpenseRow {
  id: string; amount: number; currency: string; expense_date: string; description: string | null; status: string;
  departments: { name: string } | { name: string }[] | null;
  op_expense_categories: { name: string } | { name: string }[] | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

export default function ExpensesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      setMyEmployeeId(appUser?.employee_id ?? null);
    }
    const [deptRes, catRes, empRes, expRes] = await Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("op_expense_categories").select("id, name").order("name"),
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("op_expenses").select("id, amount, currency, expense_date, description, status, departments(name), op_expense_categories(name), employees(full_name)").order("expense_date", { ascending: false })
    ]);
    setDepartments((deptRes.data as DeptOption[]) ?? []);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setEmployees(empRes.data ?? []);
    setExpenses((expRes.data as unknown as ExpenseRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("op_expenses").insert({
      department_id: form.get("departmentId") || null, category_id: form.get("categoryId") || null,
      amount: Number(form.get("amount")), currency: form.get("currency"), expense_date: form.get("date"),
      description: form.get("description"), submitted_by: myEmployeeId
    });
    setSaving(false); setAdding(false); load();
  }

  async function decide(id: string, status: "Approved" | "Rejected") {
    await supabase.from("op_expenses").update({ status }).eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Expenses</h1>
      <p className="mt-1 text-sm text-ink-muted">Operational/departmental expenses — distinct from employee expense claims in HRM &rarr; Claims.</p>

      <div className="mt-6 mb-3 flex justify-end"><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Log expense</button></div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Submitted by</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : expenses.map((e) => (
              <tr key={e.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-ink-muted">{e.expense_date}</td>
                <td className="px-4 py-3 text-ink-muted">{one(e.departments)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{one(e.op_expense_categories)?.name ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-ink">{e.currency} {e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-ink-muted">{one(e.employees)?.full_name ?? "—"}</td>
                <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[e.status])}>{e.status}</span></td>
                <td className="px-4 py-3">
                  {e.status === "Pending" && <div className="flex justify-end gap-1"><button onClick={() => decide(e.id, "Approved")} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button><button onClick={() => decide(e.id, "Rejected")} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button></div>}
                </td>
              </tr>
            ))}
            {!loading && expenses.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">No expenses logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Log expense" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Department</label><select name="departmentId" className={inputCls}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Category</label><select name="categoryId" className={inputCls}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Amount *</label><input name="amount" type="number" step="0.01" required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Currency</label><input name="currency" defaultValue="SCR" className={inputCls} /></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Date *</label><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description</label><textarea name="description" rows={2} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

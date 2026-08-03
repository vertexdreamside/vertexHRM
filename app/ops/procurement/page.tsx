"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Truck, FileText, Plus, Check, X as XIcon, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const prStatusStyles: Record<string, string> = {
  Pending: "bg-state-warningBg text-state-warning", Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger", Ordered: "bg-brand-50 text-brand-700"
};
const poStatusStyles: Record<string, string> = {
  Draft: "bg-surface-subtle text-ink-soft", Sent: "bg-state-warningBg text-state-warning",
  Received: "bg-state-successBg text-state-success", Cancelled: "bg-state-dangerBg text-state-danger"
};

function one<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }
function Loading() { return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>; }

interface EmployeeOption { id: string; full_name: string }
interface SupplierRow { id: string; name: string; contact_email: string | null; phone: string | null }
interface PurchaseRequestRow { id: string; requested_by: string; item_description: string; quantity: number; estimated_cost: number | null; status: string; created_at: string; employees: { full_name: string } | { full_name: string }[] | null }
interface PurchaseOrderRow { id: string; purchase_request_id: string | null; supplier_id: string | null; po_number: string; amount: number | null; currency: string; status: string; suppliers: { name: string } | { name: string }[] | null }

export default function ProcurementPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"pr" | "suppliers" | "po">("pr");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [prs, setPrs] = useState<PurchaseRequestRow[]>([]);
  const [pos, setPos] = useState<PurchaseOrderRow[]>([]);
  const [addingPr, setAddingPr] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [addingPo, setAddingPo] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [empRes, supRes, prRes, poRes] = await Promise.all([
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("suppliers").select("id, name, contact_email, phone").order("name"),
      supabase.from("purchase_requests").select("id, requested_by, item_description, quantity, estimated_cost, status, created_at, employees(full_name)").order("created_at", { ascending: false }),
      supabase.from("purchase_orders").select("id, purchase_request_id, supplier_id, po_number, amount, currency, status, suppliers(name)").order("created_at", { ascending: false })
    ]);
    setEmployees(empRes.data ?? []);
    setSuppliers((supRes.data as SupplierRow[]) ?? []);
    setPrs((prRes.data as unknown as PurchaseRequestRow[]) ?? []);
    setPos((poRes.data as unknown as PurchaseOrderRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function savePr(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("purchase_requests").insert({
      requested_by: form.get("employeeId"), item_description: form.get("item"),
      quantity: Number(form.get("quantity")), estimated_cost: form.get("cost") ? Number(form.get("cost")) : null
    });
    setSaving(false); setAddingPr(false); load();
  }
  async function decidePr(id: string, status: "Approved" | "Rejected") {
    await supabase.from("purchase_requests").update({ status }).eq("id", id);
    load();
  }
  async function saveSupplier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("suppliers").insert({ name: form.get("name"), contact_email: form.get("email"), phone: form.get("phone") });
    setSaving(false); setAddingSupplier(false); load();
  }
  async function savePo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("purchase_orders").insert({
      purchase_request_id: form.get("purchaseRequestId") || null, supplier_id: form.get("supplierId") || null,
      po_number: form.get("poNumber"), amount: form.get("amount") ? Number(form.get("amount")) : null, currency: form.get("currency")
    });
    setSaving(false); setAddingPo(false); load();
  }
  async function updatePoStatus(id: string, status: string) {
    setPos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("purchase_orders").update({ status }).eq("id", id);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Procurement</h1>
      <p className="mt-1 text-sm text-ink-muted">Purchase requests, suppliers, and purchase orders.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        <button onClick={() => setTab("pr")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "pr" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><ShoppingCart size={15} /> Purchase Requests</button>
        <button onClick={() => setTab("suppliers")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "suppliers" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><Truck size={15} /> Suppliers</button>
        <button onClick={() => setTab("po")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "po" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><FileText size={15} /> Purchase Orders</button>
      </div>

      <div className="mt-6">
        {loading ? <Loading /> : (
          <>
            {tab === "pr" && (
              <div>
                <div className="mb-3 flex justify-end"><button onClick={() => setAddingPr(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New purchase request</button></div>
                <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Requested by</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Est. cost</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                    <tbody>
                      {prs.map((r) => (
                        <tr key={r.id} className="border-t border-surface-border">
                          <td className="px-4 py-3 font-medium text-ink">{one(r.employees)?.full_name ?? "—"}</td>
                          <td className="px-4 py-3 text-ink-muted">{r.item_description}</td>
                          <td className="px-4 py-3 text-ink-muted">{r.quantity}</td>
                          <td className="px-4 py-3 text-ink-muted">{r.estimated_cost ?? "—"}</td>
                          <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", prStatusStyles[r.status])}>{r.status}</span></td>
                          <td className="px-4 py-3">
                            {r.status === "Pending" && <div className="flex justify-end gap-1"><button onClick={() => decidePr(r.id, "Approved")} className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button><button onClick={() => decidePr(r.id, "Rejected")} className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button></div>}
                          </td>
                        </tr>
                      ))}
                      {prs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No purchase requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "suppliers" && (
              <div>
                <div className="mb-3 flex justify-end"><button onClick={() => setAddingSupplier(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add supplier</button></div>
                <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th></tr></thead>
                    <tbody>
                      {suppliers.map((s) => (<tr key={s.id} className="border-t border-surface-border"><td className="px-4 py-3 font-medium text-ink">{s.name}</td><td className="px-4 py-3 text-ink-muted">{s.contact_email ?? "—"}</td><td className="px-4 py-3 text-ink-muted">{s.phone ?? "—"}</td></tr>))}
                      {suppliers.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">No suppliers yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "po" && (
              <div>
                <div className="mb-3 flex justify-end"><button onClick={() => setAddingPo(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New purchase order</button></div>
                <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">PO Number</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody>
                      {pos.map((p) => (
                        <tr key={p.id} className="border-t border-surface-border">
                          <td className="px-4 py-3 font-medium text-ink">{p.po_number}</td>
                          <td className="px-4 py-3 text-ink-muted">{one(p.suppliers)?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-ink-muted">{p.currency} {p.amount ?? "—"}</td>
                          <td className="px-4 py-3">
                            <select value={p.status} onChange={(e) => updatePoStatus(p.id, e.target.value)} className={clsx("rounded-full border-0 px-2.5 py-0.5 text-xs font-medium", poStatusStyles[p.status])}>
                              <option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Received">Received</option><option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {pos.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No purchase orders yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {addingPr && (
        <Modal title="New purchase request" onClose={() => setAddingPr(false)}>
          <form onSubmit={savePr} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Requested by *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Item *</label><input name="item" required className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Quantity *</label><input name="quantity" type="number" min={1} defaultValue={1} required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Estimated cost</label><input name="cost" type="number" step="0.01" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingPr(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Submit</button></div>
          </form>
        </Modal>
      )}

      {addingSupplier && (
        <Modal title="Add supplier" onClose={() => setAddingSupplier(false)}>
          <form onSubmit={saveSupplier} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Email</label><input name="email" type="email" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Phone</label><input name="phone" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingSupplier(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}

      {addingPo && (
        <Modal title="New purchase order" onClose={() => setAddingPo(false)}>
          <form onSubmit={savePo} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">PO Number *</label><input name="poNumber" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Linked purchase request</label><select name="purchaseRequestId" className={inputCls}><option value="">—</option>{prs.map((r) => <option key={r.id} value={r.id}>{r.item_description}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Supplier</label><select name="supplierId" className={inputCls}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Amount</label><input name="amount" type="number" step="0.01" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Currency</label><input name="currency" defaultValue="SCR" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingPo(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

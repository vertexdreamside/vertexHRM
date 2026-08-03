"use client";

import { useEffect, useState } from "react";
import { Boxes, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

interface ItemRow { id: string; name: string; sku: string | null; quantity_on_hand: number; reorder_level: number; location: string | null }

export default function InventoryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("inventory_items").select("id, name, sku, quantity_on_hand, reorder_level, location").order("name");
    setItems((data as ItemRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("inventory_items").insert({
      name: form.get("name"), sku: form.get("sku") || null,
      quantity_on_hand: Number(form.get("qty")), reorder_level: Number(form.get("reorder")), location: form.get("location")
    });
    setSaving(false); setAdding(false); load();
  }

  async function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity_on_hand: qty } : i)));
    await supabase.from("inventory_items").update({ quantity_on_hand: qty }).eq("id", id);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Inventory</h1>
      <p className="mt-1 text-sm text-ink-muted">Office supplies and stock levels — live from Supabase.</p>

      <div className="mt-6 mb-3 flex justify-end"><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add item</button></div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Qty on hand</th><th className="px-4 py-3">Reorder level</th><th className="px-4 py-3">Location</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : items.map((i) => {
              const low = i.quantity_on_hand <= i.reorder_level;
              return (
                <tr key={i.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">
                    <span className="flex items-center gap-1.5">{i.name} {low && <AlertTriangle size={13} className="text-state-warning" />}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{i.sku ?? "—"}</td>
                  <td className="px-4 py-3"><input type="number" value={i.quantity_on_hand} onChange={(e) => updateQty(i.id, Number(e.target.value))} className="w-20 rounded-md border border-surface-border px-2 py-1 text-sm" /></td>
                  <td className="px-4 py-3 text-ink-muted">{i.reorder_level}</td>
                  <td className="px-4 py-3 text-ink-muted">{i.location ?? "—"}</td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No items yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add inventory item" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">SKU</label><input name="sku" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Quantity on hand *</label><input name="qty" type="number" defaultValue={0} required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Reorder level</label><input name="reorder" type="number" defaultValue={0} className={inputCls} /></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Location</label><input name="location" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

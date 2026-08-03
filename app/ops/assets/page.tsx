"use client";

import { useEffect, useState } from "react";
import { Package, Car, Plus, Loader2, Fuel } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const statusStyles: Record<string, string> = {
  "In Use": "bg-state-successBg text-state-success", "In Storage": "bg-surface-subtle text-ink-soft",
  "Under Repair": "bg-state-warningBg text-state-warning", Retired: "bg-state-dangerBg text-state-danger"
};

function one<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }
function Loading() { return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>; }

interface EmployeeOption { id: string; full_name: string }
interface CategoryRow { id: string; name: string }
interface AssetRow {
  id: string; asset_tag: string; name: string; status: string; purchase_date: string | null; value: number | null;
  asset_categories: { name: string } | { name: string }[] | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}
interface VehicleRow { id: string; plate_number: string; make_model: string | null; insurance_expiry: string | null; next_service_date: string | null }

export default function AssetsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"assets" | "fleet">("assets");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [addingAsset, setAddingAsset] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [empRes, catRes, assetRes, vehicleRes] = await Promise.all([
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("asset_categories").select("id, name").order("name"),
      supabase.from("assets").select("id, asset_tag, name, status, purchase_date, value, asset_categories(name), employees(full_name)").order("asset_tag"),
      supabase.from("vehicles").select("id, plate_number, make_model, insurance_expiry, next_service_date").order("plate_number")
    ]);
    setEmployees(empRes.data ?? []);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setAssets((assetRes.data as unknown as AssetRow[]) ?? []);
    setVehicles((vehicleRes.data as VehicleRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function saveAsset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("assets").insert({
      asset_tag: form.get("assetTag"), name: form.get("name"), category_id: form.get("categoryId") || null,
      assigned_to: form.get("assignedTo") || null, purchase_date: form.get("purchaseDate") || null, value: form.get("value") ? Number(form.get("value")) : null
    });
    setSaving(false); setAddingAsset(false); load();
  }
  async function updateAssetStatus(id: string, status: string) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await supabase.from("assets").update({ status }).eq("id", id);
  }
  async function saveVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("vehicles").insert({
      plate_number: form.get("plate"), make_model: form.get("makeModel"),
      insurance_expiry: form.get("insuranceExpiry") || null, next_service_date: form.get("nextService") || null
    });
    setSaving(false); setAddingVehicle(false); load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Assets</h1>
      <p className="mt-1 text-sm text-ink-muted">Company assets and the vehicle fleet — live from Supabase.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        <button onClick={() => setTab("assets")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "assets" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><Package size={15} /> Assets</button>
        <button onClick={() => setTab("fleet")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "fleet" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><Car size={15} /> Vehicle Fleet</button>
      </div>

      <div className="mt-6">
        {loading ? <Loading /> : (
          <>
            {tab === "assets" && (
              <div>
                <div className="mb-3 flex justify-end"><button onClick={() => setAddingAsset(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add asset</button></div>
                <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Tag</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody>
                      {assets.map((a) => (
                        <tr key={a.id} className="border-t border-surface-border">
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">{a.asset_tag}</td>
                          <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
                          <td className="px-4 py-3 text-ink-muted">{one(a.asset_categories)?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-ink-muted">{one(a.employees)?.full_name ?? "Unassigned"}</td>
                          <td className="px-4 py-3">
                            <select value={a.status} onChange={(e) => updateAssetStatus(a.id, e.target.value)} className={clsx("rounded-full border-0 px-2.5 py-0.5 text-xs font-medium", statusStyles[a.status])}>
                              <option value="In Use">In Use</option><option value="In Storage">In Storage</option><option value="Under Repair">Under Repair</option><option value="Retired">Retired</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {assets.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No assets yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "fleet" && (
              <div>
                <div className="mb-3 flex justify-end"><button onClick={() => setAddingVehicle(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add vehicle</button></div>
                <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Plate</th><th className="px-4 py-3">Make/Model</th><th className="px-4 py-3">Insurance expiry</th><th className="px-4 py-3">Next service</th></tr></thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} className="border-t border-surface-border">
                          <td className="px-4 py-3 font-medium text-ink">{v.plate_number}</td>
                          <td className="px-4 py-3 text-ink-muted">{v.make_model ?? "—"}</td>
                          <td className="px-4 py-3 text-ink-muted">{v.insurance_expiry ?? "—"}</td>
                          <td className="px-4 py-3 text-ink-muted">{v.next_service_date ?? "—"}</td>
                        </tr>
                      ))}
                      {vehicles.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No vehicles yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft"><Fuel size={13} /> Fuel logs aren&apos;t wired to a UI yet — the vehicle_fuel_logs table exists (migration 0038) for when that&apos;s needed.</p>
              </div>
            )}
          </>
        )}
      </div>

      {addingAsset && (
        <Modal title="Add asset" onClose={() => setAddingAsset(false)}>
          <form onSubmit={saveAsset} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Asset Tag *</label><input name="assetTag" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Category</label><select name="categoryId" className={inputCls}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Assigned to</label><select name="assignedTo" className={inputCls}><option value="">Unassigned</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Purchase date</label><input name="purchaseDate" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Value</label><input name="value" type="number" step="0.01" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingAsset(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}

      {addingVehicle && (
        <Modal title="Add vehicle" onClose={() => setAddingVehicle(false)}>
          <form onSubmit={saveVehicle} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Plate number *</label><input name="plate" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Make/Model</label><input name="makeModel" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Insurance expiry</label><input name="insuranceExpiry" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Next service</label><input name="nextService" type="date" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingVehicle(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

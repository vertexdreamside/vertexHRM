"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  MapPin,
  Network,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { key: "general", label: "General Information", icon: Building2 },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "structure", label: "Structure", icon: Network },
  { key: "holidays", label: "Holiday Calendar", icon: CalendarDays }
] as const;

type TabKey = (typeof TABS)[number]["key"];

function OrganizationPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "general");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Organization</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Company profile, offices, org structure, and the holiday calendar — live from Supabase.
      </p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
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
        {activeTab === "general" && <GeneralInfoTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "structure" && <StructureTab />}
        {activeTab === "holidays" && <HolidaysTab />}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const inputClsReadOnly = "w-full rounded-md border border-surface-border px-3 py-2 text-sm bg-surface-subtle text-ink-muted";

// ---------------------------------------------------------------------
// 2.1 General Information
// ---------------------------------------------------------------------
interface OrgProfile {
  organization_name: string;
  registration_number: string | null;
  spf_employer_number: string | null;
  src_tax_number: string | null;
  phone: string | null;
  email: string | null;
  address_1: string | null;
  address_2: string | null;
  island: string | null;
  district: string | null;
  country: string | null;
  notes: string | null;
}

function GeneralInfoTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [profileRes, countRes] = await Promise.all([
      supabase.from("organization_profile").select("*").eq("id", true).single(),
      supabase.from("employees").select("id", { count: "exact", head: true })
    ]);
    if (profileRes.error) {
      setError(profileRes.error.message);
    } else {
      setProfile(profileRes.data as OrgProfile);
    }
    setEmployeeCount(countRes.count ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const { error } = await supabase
      .from("organization_profile")
      .update({
        organization_name: form.get("organizationName"),
        registration_number: form.get("registrationNumber"),
        spf_employer_number: form.get("spfEmployerNumber"),
        src_tax_number: form.get("srcTaxNumber"),
        phone: form.get("phone"),
        email: form.get("email"),
        address_1: form.get("address1"),
        address_2: form.get("address2"),
        island: form.get("island"),
        district: form.get("district"),
        country: form.get("country"),
        notes: form.get("notes"),
        updated_at: new Date().toISOString()
      })
      .eq("id", true);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }
  if (!profile) {
    return <p className="text-sm text-state-danger">Couldn&apos;t load organization profile{error ? `: ${error}` : "."}</p>;
  }

  const field = (label: string, name: string, defaultValue: string | null, readOnly = false, type = "text") => (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-ink">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} readOnly={readOnly} className={readOnly ? inputClsReadOnly : inputCls} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-card border border-surface-border bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("Organization Name *", "organizationName", profile.organization_name)}
        {field("Number of Employees", "numberOfEmployees", String(employeeCount), true)}
        {field("Registration Number", "registrationNumber", profile.registration_number)}
        {field("Phone", "phone", profile.phone)}
        {field("Email", "email", profile.email, false, "email")}
        {field("Country", "country", profile.country)}
      </div>

      <div className="border-t border-surface-border pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Statutory registration (§6.2)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Seychelles Pension Fund employer no.", "spfEmployerNumber", profile.spf_employer_number)}
          {field("SRC tax registration no.", "srcTaxNumber", profile.src_tax_number)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("Address 1", "address1", profile.address_1)}
        {field("Address 2", "address2", profile.address_2)}
        {field("Island", "island", profile.island)}
        {field("District", "district", profile.district)}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-ink">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={profile.notes ?? ""} className={inputCls} />
      </div>

      {error && <p className="text-sm text-state-danger">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          {saving && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        {saved && <span className="text-sm text-state-success">Saved</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// 2.2 Locations
// ---------------------------------------------------------------------
interface LocationRow {
  id: string;
  name: string;
  country: string | null;
  island: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

function LocationsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [editing, setEditing] = useState<LocationRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("locations").select("*").order("name");
    setLocations((data as LocationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = {
      name: form.get("name"),
      country: form.get("country"),
      island: form.get("island"),
      phone: form.get("phone"),
      address: form.get("address"),
      notes: form.get("notes")
    };

    const { error } =
      editing === "new"
        ? await supabase.from("locations").insert(record)
        : editing
          ? await supabase.from("locations").update(record).eq("id", editing.id)
          : { error: null };

    setSaving(false);
    if (error) {
      // This exact class of bug (a form field with no matching column,
      // insert rejected, nothing shown) is what made this look like it
      // "didn't save" before — now any real failure is visible instead
      // of silently swallowed.
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) {
      alert(`Couldn't delete — it may still be referenced by an employee or asset: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add location
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Island</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{loc.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{loc.country}</td>
                  <td className="px-4 py-3 text-ink-muted">{loc.island}</td>
                  <td className="px-4 py-3 text-ink-muted">{loc.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(loc)} aria-label={`Edit ${loc.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(loc.id)} aria-label={`Delete ${loc.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No locations yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing === "new" ? "Add location" : "Edit location"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Name *</label>
              <input name="name" required defaultValue={editingRecord?.name} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Country *</label>
                <input name="country" required defaultValue={editingRecord?.country ?? "Seychelles"} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Island</label>
                <input name="island" defaultValue={editingRecord?.island ?? ""} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Phone Number</label>
              <input name="phone" defaultValue={editingRecord?.phone ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Address</label>
              <input name="address" defaultValue={editingRecord?.address ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Notes</label>
              <textarea name="notes" rows={2} defaultValue={editingRecord?.notes ?? ""} className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 2.3 Structure
// ---------------------------------------------------------------------
interface DeptRow {
  id: string;
  name: string;
  parent_id: string | null;
  unit_id: string | null;
  description: string | null;
}

function StructureTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<DeptRow[]>([]);
  const [editing, setEditing] = useState<DeptRow | "new" | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("departments").select("id, name, parent_id, unit_id, description").order("name");
    setUnits((data as DeptRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = {
      name: form.get("name"),
      unit_id: form.get("unitId") || null,
      description: form.get("description") || null,
      parent_id: form.get("parentId") || null
    };

    const { error } =
      editing === "new"
        ? await supabase.from("departments").insert(record)
        : editing
          ? await supabase.from("departments").update(record).eq("id", editing.id)
          : { error: null };

    setSaving(false);
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setEditing(null);
    setNewParentId(null);
    load();
  }

  function openAddSubUnit(parentId: string) {
    setNewParentId(parentId);
    setEditing("new");
  }

  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    const children = units.filter((u) => u.parent_id === parentId);
    if (children.length === 0) return null;
    return (
      <ul className={depth > 0 ? "ml-6 border-l border-surface-border pl-4" : ""}>
        {children.map((u) => (
          <li key={u.id} className="py-1.5">
            <div className="group flex items-center gap-2">
              <span className="font-medium text-ink">{u.name}</span>
              <span className="font-mono text-xs text-ink-soft">{u.unit_id || u.id.slice(0, 8).toUpperCase()}</span>
              {u.description && <span className="text-xs text-ink-soft">— {u.description}</span>}
              <button onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`} className="rounded p-1 text-ink-soft opacity-0 hover:bg-surface-subtle hover:text-brand-700 group-hover:opacity-100"><Pencil size={13} /></button>
              <button onClick={() => openAddSubUnit(u.id)} className="text-xs text-ink-soft opacity-0 hover:text-brand-700 group-hover:opacity-100">+ sub-unit</button>
            </div>
            {renderTree(u.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => { setNewParentId(null); setEditing("new"); }} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add organization unit
        </button>
      </div>

      <div className="rounded-card border border-surface-border bg-white p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          renderTree(null) ?? <p className="text-sm text-ink-soft">No organization units yet.</p>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing === "new" ? "Add organization unit" : "Edit organization unit"} onClose={() => { setEditing(null); setNewParentId(null); }}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Name *</label>
              <input name="name" required defaultValue={editingRecord?.name} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Unit ID</label>
              <input name="unitId" placeholder="e.g. HR-01" defaultValue={editingRecord?.unit_id ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Description</label>
              <textarea name="description" rows={2} defaultValue={editingRecord?.description ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Parent unit</label>
              <select name="parentId" defaultValue={editingRecord?.parent_id ?? newParentId ?? ""} className={inputCls}>
                <option value="">None — top level</option>
                {units.filter((u) => u.id !== editingRecord?.id).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setEditing(null); setNewParentId(null); }} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 2.4 Holiday Calendar
// ---------------------------------------------------------------------
interface HolidayRow {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
}

function HolidaysTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [editing, setEditing] = useState<HolidayRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("holidays").select("id, name, date, recurring").order("date");
    setHolidays((data as HolidayRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = {
      name: form.get("name"),
      date: form.get("date"),
      recurring: form.get("recurring") === "on"
    };

    if (editing === "new") {
      await supabase.from("holidays").insert(record);
    } else if (editing) {
      await supabase.from("holidays").update(record).eq("id", editing.id);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    await supabase.from("holidays").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Seeded with Seychelles public holidays per HRM Admin spec §6.3 — review yearly, dates shift.
      </p>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add holiday
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Holiday name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Recurring</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{h.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{h.recurring ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(h)} aria-label={`Edit ${h.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(h.id)} aria-label={`Delete ${h.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <Modal title={editing === "new" ? "Add holiday" : "Edit holiday"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Holiday name *</label>
              <input name="name" required defaultValue={editingRecord?.name} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Date *</label>
              <input name="date" type="date" required defaultValue={editingRecord?.date} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="recurring" defaultChecked={editingRecord?.recurring ?? true} /> Recurring annually
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationPageInner />
    </Suspense>
  );
}

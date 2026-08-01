"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  Network,
  CalendarDays,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { OrgLocation, OrgUnit, Holiday } from "@/lib/types";

// TODO(supabase): general info is a single row — either a one-row table
// or a fixed-id row in `organizations`; not modeled in migration 0001
// yet since this scaffold only covers the shared platform layer.
const SEED_GENERAL_INFO = {
  organizationName: "Round Table Seychelles",
  numberOfEmployees: 3, // TODO(supabase): derive from count(employees), read-only in the UI
  registrationNumber: "",
  spfEmployerNumber: "",
  srcTaxNumber: "",
  phone: "",
  email: "",
  address1: "",
  address2: "",
  island: "Mahé",
  district: "",
  country: "Seychelles",
  notes: ""
};

const SEED_LOCATIONS: OrgLocation[] = [
  {
    id: "1",
    name: "Head Office",
    country: "Seychelles",
    island: "Mahé",
    phone: "",
    address: "Victoria"
  }
];

const SEED_UNITS: OrgUnit[] = [
  { id: "1", unitId: "U-001", name: "Board", description: "", parentId: null },
  { id: "2", unitId: "U-002", name: "CEO", description: "", parentId: "1" },
  {
    id: "3",
    unitId: "U-003",
    name: "Operations",
    description: "",
    parentId: "2"
  }
];

// Seeded per HRM Admin spec §6.3 — review yearly against the official
// Government of Seychelles calendar, dates shift.
const SEED_HOLIDAYS: Holiday[] = [
  { id: "1", name: "New Year's Day", date: "2026-01-01", recurring: true, appliesTo: "all" },
  { id: "2", name: "Constitution Day", date: "2026-06-18", recurring: true, appliesTo: "all" },
  { id: "3", name: "Independence Day", date: "2026-06-29", recurring: true, appliesTo: "all" },
  { id: "4", name: "Christmas Day", date: "2026-12-25", recurring: true, appliesTo: "all" }
];

const TABS = [
  { key: "general", label: "General Information", icon: Building2 },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "structure", label: "Structure", icon: Network },
  { key: "holidays", label: "Holiday Calendar", icon: CalendarDays }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Organization
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Company profile, offices, org structure, and the holiday calendar
        that feeds Leave and Time.
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
        {activeTab === "general" && <GeneralInfoTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "structure" && <StructureTab />}
        {activeTab === "holidays" && <HolidaysTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2.1 General Information
// ---------------------------------------------------------------------
function GeneralInfoTab() {
  const [info, setInfo] = useState(SEED_GENERAL_INFO);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setInfo((prev) => ({
      ...prev,
      organizationName: String(form.get("organizationName")),
      registrationNumber: String(form.get("registrationNumber")),
      spfEmployerNumber: String(form.get("spfEmployerNumber")),
      srcTaxNumber: String(form.get("srcTaxNumber")),
      phone: String(form.get("phone")),
      email: String(form.get("email")),
      address1: String(form.get("address1")),
      address2: String(form.get("address2")),
      island: String(form.get("island")),
      district: String(form.get("district")),
      country: String(form.get("country")),
      notes: String(form.get("notes"))
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // TODO(supabase): upsert into an `organizations` table (single row).
  }

  const field = (
    label: string,
    name: string,
    defaultValue: string,
    opts?: { readOnly?: boolean; type?: string }
  ) => (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={opts?.type ?? "text"}
        defaultValue={defaultValue}
        readOnly={opts?.readOnly}
        className={clsx(
          "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500",
          opts?.readOnly && "bg-surface-subtle text-ink-muted"
        )}
      />
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-card border border-surface-border bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("Organization Name *", "organizationName", info.organizationName)}
        {field("Number of Employees", "numberOfEmployees", String(info.numberOfEmployees), {
          readOnly: true
        })}
        {field("Registration Number", "registrationNumber", info.registrationNumber)}
        {field("Phone", "phone", info.phone)}
        {field("Email", "email", info.email, { type: "email" })}
        {field("Country", "country", info.country)}
      </div>

      <div className="border-t border-surface-border pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Statutory registration (§6.2)
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Seychelles Pension Fund employer no.", "spfEmployerNumber", info.spfEmployerNumber)}
          {field("SRC tax registration no.", "srcTaxNumber", info.srcTaxNumber)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("Address 1", "address1", info.address1)}
        {field("Address 2", "address2", info.address2)}
        {field("Island", "island", info.island)}
        {field("District", "district", info.district)}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={info.notes}
          className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save
        </button>
        {saved && <span className="text-sm text-state-success">Saved</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// 2.2 Locations
// ---------------------------------------------------------------------
function LocationsTab() {
  const [locations, setLocations] = useState<OrgLocation[]>(SEED_LOCATIONS);
  const [editing, setEditing] = useState<OrgLocation | "new" | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const country = String(form.get("country"));
    const island = String(form.get("island"));
    const phone = String(form.get("phone"));
    const address = String(form.get("address"));

    if (editing === "new") {
      setLocations((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, country, island, phone, address }
      ]);
      // TODO(supabase): insert into `locations`
    } else if (editing) {
      setLocations((prev) =>
        prev.map((l) =>
          l.id === editing.id
            ? { ...l, name, country, island, phone, address }
            : l
        )
      );
      // TODO(supabase): update `locations` where id = editing.id
    }
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Delete this location?")) return;
    setLocations((prev) => prev.filter((l) => l.id !== id));
    // TODO(supabase): delete from `locations` — guard in the real
    // implementation against locations still referenced by employees.
  }

  const editingRecord = editing !== "new" ? editing : null;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add location
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
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
                    <button
                      onClick={() => setEditing(loc)}
                      aria-label={`Edit ${loc.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(loc.id)}
                      aria-label={`Delete ${loc.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal
          title={editing === "new" ? "Add location" : "Edit location"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={editingRecord?.name}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium text-ink">
                  Country *
                </label>
                <input
                  id="country"
                  name="country"
                  required
                  defaultValue={editingRecord?.country ?? "Seychelles"}
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="island" className="mb-1 block text-sm font-medium text-ink">
                  Island
                </label>
                <input
                  id="island"
                  name="island"
                  defaultValue={editingRecord?.island}
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-ink">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={editingRecord?.phone}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-ink">
                Address
              </label>
              <input
                id="address"
                name="address"
                defaultValue={editingRecord?.address}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
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
// 2.3 Structure
// ---------------------------------------------------------------------
function StructureTab() {
  const [units, setUnits] = useState<OrgUnit[]>(SEED_UNITS);
  const [adding, setAdding] = useState(false);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const description = String(form.get("description"));
    const parentId = String(form.get("parentId")) || null;

    setUnits((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        unitId: `U-${String(prev.length + 1).padStart(3, "0")}`,
        name,
        description,
        parentId
      }
    ]);
    // TODO(supabase): insert into `departments` (parent_id self-reference)
    setAdding(false);
  }

  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    const children = units.filter((u) => u.parentId === parentId);
    if (children.length === 0) return null;
    return (
      <ul className={depth > 0 ? "ml-6 border-l border-surface-border pl-4" : ""}>
        {children.map((u) => (
          <li key={u.id} className="py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{u.name}</span>
              <span className="text-xs text-ink-soft">{u.unitId}</span>
            </div>
            {u.description && (
              <p className="text-xs text-ink-muted">{u.description}</p>
            )}
            {renderTree(u.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add organization unit
        </button>
      </div>

      <div className="rounded-card border border-surface-border bg-white p-6">
        {renderTree(null) ?? (
          <p className="text-sm text-ink-soft">No organization units yet.</p>
        )}
      </div>

      {adding && (
        <Modal title="Add organization unit" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="parentId" className="mb-1 block text-sm font-medium text-ink">
                Parent unit
              </label>
              <select
                id="parentId"
                name="parentId"
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              >
                <option value="">None — top level</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
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

// ---------------------------------------------------------------------
// 2.4 Holiday Calendar
// ---------------------------------------------------------------------
function HolidaysTab() {
  const [holidays, setHolidays] = useState<Holiday[]>(SEED_HOLIDAYS);
  const [adding, setAdding] = useState(false);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const date = String(form.get("date"));
    const recurring = form.get("recurring") === "on";

    setHolidays((prev) =>
      [...prev, { id: crypto.randomUUID(), name, date, recurring, appliesTo: "all" }].sort(
        (a, b) => a.date.localeCompare(b.date)
      )
    );
    // TODO(supabase): insert into `holidays`
    setAdding(false);
  }

  function remove(id: string) {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    // TODO(supabase): delete from `holidays`
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Seeded with Seychelles public holidays per HRM Admin spec §6.3 —
        dates shift yearly, review against the official government
        calendar rather than relying on this list indefinitely.
      </p>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add holiday
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
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
                  {new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long"
                  })}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {h.recurring ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => remove(h.id)}
                      aria-label={`Delete ${h.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add holiday" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Holiday name *
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="date" className="mb-1 block text-sm font-medium text-ink">
                Date *
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="recurring" defaultChecked />
              Recurring annually
            </label>
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

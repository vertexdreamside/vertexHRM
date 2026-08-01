"use client";

import { useState } from "react";
import {
  Briefcase,
  Wallet,
  ClipboardCheck,
  Tags,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Upload
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type {
  JobTitle,
  PayGrade,
  Currency,
  EmploymentStatus,
  JobCategory,
  WorkShift
} from "@/lib/types";

const SEED_JOB_TITLES: JobTitle[] = [
  { id: "1", title: "Accountant", description: "", specFileName: null, notes: "" },
  { id: "2", title: "IT Officer", description: "", specFileName: null, notes: "" }
];

const SEED_CURRENCIES: Currency[] = [
  { id: "1", code: "SCR", name: "Seychelles Rupee", symbol: "₨" },
  { id: "2", code: "USD", name: "US Dollar", symbol: "$" }
];

const SEED_PAY_GRADES: PayGrade[] = [
  { id: "1", name: "Grade 1", currencyCode: "SCR", minSalary: 8000, maxSalary: 12000 },
  { id: "2", name: "Grade 2", currencyCode: "SCR", minSalary: 12000, maxSalary: 18000 }
];

// Statutory-adjacent defaults (Employment Act categories) — enabled by
// default, all editable/removable per HRM Admin spec §1.3.3.
const SEED_EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  { id: "1", name: "Freelance", enabled: true, isDefault: true },
  { id: "2", name: "Full-Time Contract", enabled: true, isDefault: true },
  { id: "3", name: "Full-Time Permanent", enabled: true, isDefault: true },
  { id: "4", name: "Full-Time Probation", enabled: true, isDefault: true },
  { id: "5", name: "Part-Time Contract", enabled: true, isDefault: true },
  { id: "6", name: "Part-Time Internship", enabled: true, isDefault: true }
];

const SEED_JOB_CATEGORIES: JobCategory[] = [
  { id: "1", name: "Receptionist" },
  { id: "2", name: "Driver" },
  { id: "3", name: "Accountant" }
];

const SEED_WORK_SHIFTS: WorkShift[] = [
  { id: "1", name: "Morning Shift", from: "08:00", to: "16:00" }
];

function hoursPerDay(from: string, to: string) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const mins = th * 60 + tm - (fh * 60 + fm);
  return (mins / 60).toFixed(1);
}

const TABS = [
  { key: "titles", label: "Job Titles", icon: Briefcase },
  { key: "grades", label: "Pay Grades", icon: Wallet },
  { key: "status", label: "Employment Status", icon: ClipboardCheck },
  { key: "categories", label: "Job Category", icon: Tags },
  { key: "shifts", label: "Work Shifts", icon: Clock }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function JobSectionPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("titles");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Job Section
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Job titles, pay bands, employment statuses, categories, and shift
        definitions used across Employees and Leave.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
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
        {activeTab === "titles" && <JobTitlesTab />}
        {activeTab === "grades" && <PayGradesTab />}
        {activeTab === "status" && <EmploymentStatusTab />}
        {activeTab === "categories" && <JobCategoriesTab />}
        {activeTab === "shifts" && <WorkShiftsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 1.3.1 Job Titles
// ---------------------------------------------------------------------
function JobTitlesTab() {
  const [titles, setTitles] = useState<JobTitle[]>(SEED_JOB_TITLES);
  const [editing, setEditing] = useState<JobTitle | "new" | null>(null);
  const editingRecord = editing !== "new" ? editing : null;

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title"));
    const description = String(form.get("description"));
    const notes = String(form.get("notes"));
    const file = form.get("specFile") as File | null;
    const specFileName = file && file.size > 0 ? file.name : editingRecord?.specFileName ?? null;

    if (editing === "new") {
      setTitles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), title, description, specFileName, notes }
      ]);
      // TODO(supabase): insert into `job_titles`; upload spec file to
      // Storage and store the resulting document reference (see
      // vertex-core-data-model.md — job_titles -> documents).
    } else if (editing) {
      setTitles((prev) =>
        prev.map((t) =>
          t.id === editing.id ? { ...t, title, description, specFileName, notes } : t
        )
      );
    }
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add job title
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Job title</th>
              <th className="px-4 py-3">Job description</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {titles.map((t) => (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{t.title}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {t.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEditing(t)}
                      aria-label={`Edit ${t.title}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
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
          title={editing === "new" ? "Add job title" : "Edit job title"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-ink">
                Job Title *
              </label>
              <input
                id="title"
                name="title"
                required
                defaultValue={editingRecord?.title}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingRecord?.description}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="specFile" className="mb-1 block text-sm font-medium text-ink">
                Job Specification
              </label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="specFile"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
                >
                  <Upload size={14} /> Browse
                </label>
                <input id="specFile" name="specFile" type="file" accept=".pdf,.doc,.docx" className="hidden" />
                {editingRecord?.specFileName && (
                  <span className="text-xs text-ink-soft">
                    {editingRecord.specFileName}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                PDF, DOC, or DOCX — up to 1MB.
              </p>
            </div>
            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-ink">
                Notes (internal)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={editingRecord?.notes}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <p className="text-xs text-ink-soft">* Required field</p>
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
// 1.3.2 Pay Grades + Currency Database
// ---------------------------------------------------------------------
function PayGradesTab() {
  const [grades, setGrades] = useState<PayGrade[]>(SEED_PAY_GRADES);
  const [currencies, setCurrencies] = useState<Currency[]>(SEED_CURRENCIES);
  const [editingGrade, setEditingGrade] = useState<PayGrade | "new" | null>(null);
  const [addingCurrency, setAddingCurrency] = useState(false);
  const editingGradeRecord = editingGrade !== "new" ? editingGrade : null;

  function saveGrade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const currencyCode = String(form.get("currencyCode"));
    const minSalary = Number(form.get("minSalary"));
    const maxSalary = Number(form.get("maxSalary"));

    if (editingGrade === "new") {
      setGrades((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, currencyCode, minSalary, maxSalary }
      ]);
    } else if (editingGrade) {
      setGrades((prev) =>
        prev.map((g) =>
          g.id === editingGrade.id
            ? { ...g, name, currencyCode, minSalary, maxSalary }
            : g
        )
      );
    }
    setEditingGrade(null);
  }

  function saveCurrency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCurrencies((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        code: String(form.get("code")).toUpperCase(),
        name: String(form.get("name")),
        symbol: String(form.get("symbol"))
      }
    ]);
    setAddingCurrency(false);
    // TODO(supabase): insert into `currencies`
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setEditingGrade("new")}
            className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add pay grade
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Grade name</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Minimum salary</th>
                <th className="px-4 py-3">Maximum salary</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{g.currencyCode}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {g.minSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {g.maxSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setEditingGrade(g)}
                        aria-label={`Edit ${g.name}`}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-medium text-ink">
            Currency database
          </h3>
          <button
            onClick={() => setAddingCurrency(true)}
            className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            <Plus size={14} /> Add currency
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Symbol</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{c.code}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingGrade !== null && (
        <Modal
          title={editingGrade === "new" ? "Add pay grade" : "Edit pay grade"}
          onClose={() => setEditingGrade(null)}
        >
          <form onSubmit={saveGrade} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Name *
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={editingGradeRecord?.name}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="currencyCode" className="mb-1 block text-sm font-medium text-ink">
                Currency *
              </label>
              <select
                id="currencyCode"
                name="currencyCode"
                required
                defaultValue={editingGradeRecord?.currencyCode ?? currencies[0]?.code}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minSalary" className="mb-1 block text-sm font-medium text-ink">
                  Minimum salary
                </label>
                <input
                  id="minSalary"
                  name="minSalary"
                  type="number"
                  defaultValue={editingGradeRecord?.minSalary}
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="maxSalary" className="mb-1 block text-sm font-medium text-ink">
                  Maximum salary
                </label>
                <input
                  id="maxSalary"
                  name="maxSalary"
                  type="number"
                  defaultValue={editingGradeRecord?.maxSalary}
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingGrade(null)}
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

      {addingCurrency && (
        <Modal title="Add currency" onClose={() => setAddingCurrency(false)}>
          <form onSubmit={saveCurrency} className="space-y-4">
            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-ink">
                Currency code *
              </label>
              <input
                id="code"
                name="code"
                required
                maxLength={3}
                placeholder="SCR"
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm uppercase focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="currencyName" className="mb-1 block text-sm font-medium text-ink">
                Currency name *
              </label>
              <input
                id="currencyName"
                name="name"
                required
                placeholder="Seychelles Rupee"
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="symbol" className="mb-1 block text-sm font-medium text-ink">
                Symbol
              </label>
              <input
                id="symbol"
                name="symbol"
                placeholder="₨"
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingCurrency(false)}
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
// 1.3.3 Employment Status
// ---------------------------------------------------------------------
function EmploymentStatusTab() {
  const [statuses, setStatuses] = useState<EmploymentStatus[]>(SEED_EMPLOYMENT_STATUSES);
  const [adding, setAdding] = useState(false);

  function toggle(id: string) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    // TODO(supabase): update `employment_statuses` set enabled = ...
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    setStatuses((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, enabled: true, isDefault: false }
    ]);
    setAdding(false);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        The six defaults line up with Seychelles Employment Act categories —
        toggle any off rather than deleting, or add an organization-specific
        one.
      </p>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add employment status
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {statuses.map((s) => (
          <label
            key={s.id}
            className="flex items-center justify-between rounded-card border border-surface-border bg-white px-4 py-3"
          >
            <span className="text-sm text-ink">{s.name}</span>
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={() => toggle(s.id)}
            />
          </label>
        ))}
      </div>

      {adding && (
        <Modal title="Add employment status" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
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
// 1.3.4 Job Category
// ---------------------------------------------------------------------
function JobCategoriesTab() {
  const [categories, setCategories] = useState<JobCategory[]>(SEED_JOB_CATEGORIES);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: String(form.get("name")) }
    ]);
    setAdding(false);
  }

  function remove(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add job category
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-surface-border first:border-t-0">
                <td className="px-4 py-3 text-ink">{c.name}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(c.id)}
                    aria-label={`Delete ${c.name}`}
                    className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add job category" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
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
// 1.3.5 Work Shifts
// ---------------------------------------------------------------------
function WorkShiftsTab() {
  const [shifts, setShifts] = useState<WorkShift[]>(SEED_WORK_SHIFTS);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setShifts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        from: String(form.get("from")),
        to: String(form.get("to"))
      }
    ]);
    setAdding(false);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add work shift
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Shift name</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Hours/day</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                <td className="px-4 py-3 text-ink-muted">{s.from}</td>
                <td className="px-4 py-3 text-ink-muted">{s.to}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {hoursPerDay(s.from, s.to)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add work shift" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Shift name *
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Morning Shift"
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="from" className="mb-1 block text-sm font-medium text-ink">
                  From *
                </label>
                <input
                  id="from"
                  name="from"
                  type="time"
                  required
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="to" className="mb-1 block text-sm font-medium text-ink">
                  To *
                </label>
                <input
                  id="to"
                  name="to"
                  type="time"
                  required
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
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

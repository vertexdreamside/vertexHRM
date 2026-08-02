"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Wallet,
  ClipboardCheck,
  Tags,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

function hoursPerDay(from: string, to: string) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const mins = th * 60 + tm - (fh * 60 + fm);
  return (mins / 60).toFixed(1);
}

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const TABS = [
  { key: "titles", label: "Job Titles", icon: Briefcase },
  { key: "grades", label: "Pay Grades", icon: Wallet },
  { key: "status", label: "Employment Status", icon: ClipboardCheck },
  { key: "categories", label: "Job Category", icon: Tags },
  { key: "shifts", label: "Work Shifts", icon: Clock }
] as const;

type TabKey = (typeof TABS)[number]["key"];

function JobSectionPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "titles");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Job Section</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Job titles, pay bands, employment statuses, categories, and shift definitions — live from Supabase.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
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
        {activeTab === "titles" && <JobTitlesTab />}
        {activeTab === "grades" && <PayGradesTab />}
        {activeTab === "status" && <EmploymentStatusTab />}
        {activeTab === "categories" && <JobCategoriesTab />}
        {activeTab === "shifts" && <WorkShiftsTab />}
      </div>
    </div>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr><td colSpan={colSpan} className="px-4 py-16 text-center text-sm text-ink-soft">
      <Loader2 size={16} className="mx-auto animate-spin" />
    </td></tr>
  );
}

// ---------------------------------------------------------------------
// 1.3.1 Job Titles
// ---------------------------------------------------------------------
interface JobTitleRow { id: string; title: string; description: string | null; notes: string | null; }

function JobTitlesTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState<JobTitleRow[]>([]);
  const [editing, setEditing] = useState<JobTitleRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("job_titles").select("id, title, description, notes").order("title");
    setTitles((data as JobTitleRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = { title: form.get("title"), description: form.get("description"), notes: form.get("notes") };

    let jobTitleId = editing && editing !== "new" ? editing.id : null;
    if (editing === "new") {
      const { data } = await supabase.from("job_titles").insert(record).select("id").single();
      jobTitleId = data?.id ?? null;
    } else if (editing) {
      await supabase.from("job_titles").update(record).eq("id", editing.id);
    }

    // Job Specification upload — now real: Documents (Admin Ops §2)
    // exists, so this uploads to the same "documents" bucket/table
    // everything else there uses, rather than staying UI-only.
    const specFile = form.get("specFile") as File | null;
    if (specFile && specFile.size > 0 && jobTitleId) {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `docs/${Date.now()}-${specFile.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, specFile);
      if (!uploadError) {
        const { data: category } = await supabase.from("document_categories").select("id").eq("name", "Job Specifications").single();
        const { data: doc } = await supabase.from("documents").insert({
          name: specFile.name,
          category_id: category?.id ?? null,
          owner_id: user?.id ?? null,
          storage_path: path,
          notes: `Job specification for ${record.title}`
        }).select("id").single();
        if (doc) {
          await supabase.from("document_versions").insert({ document_id: doc.id, storage_path: path, version_number: 1, uploaded_by: user?.id });
          await supabase.from("job_titles").update({ spec_document_id: doc.id }).eq("id", jobTitleId);
        }
      }
    }

    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this job title?")) return;
    const { error } = await supabase.from("job_titles").delete().eq("id", id);
    if (error) { alert(`Couldn't delete — it may still be referenced by an employee: ${error.message}`); return; }
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add job title
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Job description</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={3} /> : titles.map((t) => (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{t.title}</td>
                <td className="px-4 py-3 text-ink-muted">{t.description || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(t)} aria-label={`Edit ${t.title}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Pencil size={16} /></button>
                    <button onClick={() => remove(t.id)} aria-label={`Delete ${t.title}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal title={editing === "new" ? "Add job title" : "Edit job title"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Job Title *</label><input name="title" required defaultValue={editingRecord?.title} className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Job Description</label><textarea name="description" rows={3} defaultValue={editingRecord?.description ?? ""} className={inputCls} /></div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Job Specification</label>
              <div className="flex items-center gap-2">
                <label htmlFor="specFile" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"><Upload size={14} /> Browse</label>
                <input id="specFile" name="specFile" type="file" accept=".pdf,.doc,.docx" className="hidden" />
              </div>
              <p className="mt-1 text-xs text-ink-soft">Uploads to Documents (category: Job Specifications).</p>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Notes (internal)</label><textarea name="notes" rows={2} defaultValue={editingRecord?.notes ?? ""} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
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
interface CurrencyRow { id: string; code: string; name: string; symbol: string | null; }
interface PayGradeRow { id: string; name: string; currency_id: string; min_salary: number | null; max_salary: number | null; }

function PayGradesTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<PayGradeRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [editingGrade, setEditingGrade] = useState<PayGradeRow | "new" | null>(null);
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [saving, setSaving] = useState(false);
  const editingGradeRecord = editingGrade !== "new" ? editingGrade : null;

  async function load() {
    setLoading(true);
    const [gradesRes, currenciesRes] = await Promise.all([
      supabase.from("pay_grades").select("id, name, currency_id, min_salary, max_salary").order("name"),
      supabase.from("currencies").select("id, code, name, symbol").order("code")
    ]);
    setGrades((gradesRes.data as PayGradeRow[]) ?? []);
    setCurrencies((currenciesRes.data as CurrencyRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function currencyCode(id: string) { return currencies.find((c) => c.id === id)?.code ?? "—"; }

  async function saveGrade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = {
      name: form.get("name"),
      currency_id: form.get("currencyId"),
      min_salary: form.get("minSalary") || null,
      max_salary: form.get("maxSalary") || null
    };
    if (editingGrade === "new") {
      await supabase.from("pay_grades").insert(record);
    } else if (editingGrade) {
      await supabase.from("pay_grades").update(record).eq("id", editingGrade.id);
    }
    setSaving(false);
    setEditingGrade(null);
    load();
  }

  async function saveCurrency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("currencies").insert({
      code: String(form.get("code")).toUpperCase(),
      name: form.get("name"),
      symbol: form.get("symbol")
    });
    setSaving(false);
    setAddingCurrency(false);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex justify-end">
          <button onClick={() => setEditingGrade("new")} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add pay grade</button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr><th className="px-4 py-3">Grade name</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Minimum salary</th><th className="px-4 py-3">Maximum salary</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={5} /> : grades.map((g) => (
                <tr key={g.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{currencyCode(g.currency_id)}</td>
                  <td className="px-4 py-3 text-ink-muted">{g.min_salary?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{g.max_salary?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><button onClick={() => setEditingGrade(g)} aria-label={`Edit ${g.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Pencil size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-medium text-ink">Currency database</h3>
          <button onClick={() => setAddingCurrency(true)} className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle"><Plus size={14} /> Add currency</button>
        </div>
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Symbol</th></tr></thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.id} className="border-t border-surface-border"><td className="px-4 py-3 font-medium text-ink">{c.code}</td><td className="px-4 py-3 text-ink-muted">{c.name}</td><td className="px-4 py-3 text-ink-muted">{c.symbol}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingGrade !== null && (
        <Modal title={editingGrade === "new" ? "Add pay grade" : "Edit pay grade"} onClose={() => setEditingGrade(null)}>
          <form onSubmit={saveGrade} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required defaultValue={editingGradeRecord?.name} className={inputCls} /></div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Currency *</label>
              <select name="currencyId" required defaultValue={editingGradeRecord?.currency_id ?? currencies[0]?.id} className={inputCls}>
                {currencies.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium text-ink">Minimum salary</label><input name="minSalary" type="number" defaultValue={editingGradeRecord?.min_salary ?? ""} className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Maximum salary</label><input name="maxSalary" type="number" defaultValue={editingGradeRecord?.max_salary ?? ""} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingGrade(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingCurrency && (
        <Modal title="Add currency" onClose={() => setAddingCurrency(false)}>
          <form onSubmit={saveCurrency} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Currency code *</label><input name="code" required maxLength={3} placeholder="SCR" className={clsx(inputCls, "uppercase")} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Currency name *</label><input name="name" required placeholder="Seychelles Rupee" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Symbol</label><input name="symbol" placeholder="₨" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingCurrency(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
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
interface StatusRow { id: string; name: string; enabled: boolean; is_default: boolean; }

function EmploymentStatusTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("employment_statuses").select("id, name, enabled, is_default").order("name");
    setStatuses((data as StatusRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(id: string, enabled: boolean) {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s)));
    await supabase.from("employment_statuses").update({ enabled: !enabled }).eq("id", id);
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("employment_statuses").insert({ name: form.get("name"), enabled: true, is_default: false });
    setSaving(false);
    setAdding(false);
    load();
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">The six defaults line up with Seychelles Employment Act categories — toggle any off rather than deleting, or add an organization-specific one.</p>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add employment status</button>
      </div>
      {loading ? <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div> : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {statuses.map((s) => (
            <label key={s.id} className="flex items-center justify-between rounded-card border border-surface-border bg-white px-4 py-3">
              <span className="text-sm text-ink">{s.name}</span>
              <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.id, s.enabled)} />
            </label>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Add employment status" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
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
interface CategoryRow { id: string; name: string; }

function JobCategoriesTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("job_categories").select("id, name").order("name");
    setCategories((data as CategoryRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("job_categories").insert({ name: form.get("name") });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("job_categories").delete().eq("id", id);
    if (error) { alert(`Couldn't delete: ${error.message}`); return; }
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add job category</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <tbody>
            {loading ? <LoadingRow colSpan={2} /> : categories.map((c, i) => (
              <tr key={c.id} className={clsx(i > 0 && "border-t border-surface-border")}>
                <td className="px-4 py-3 text-ink">{c.name}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(c.id)} aria-label={`Delete ${c.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add job category" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
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
interface ShiftRow { id: string; name: string; from_time: string; to_time: string; }

function WorkShiftsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("work_shifts").select("id, name, from_time, to_time").order("name");
    setShifts((data as ShiftRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("work_shifts").insert({
      name: form.get("name"),
      from_time: form.get("from"),
      to_time: form.get("to")
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add work shift</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Shift name</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Hours/day</th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={4} /> : shifts.map((s) => (
              <tr key={s.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                <td className="px-4 py-3 text-ink-muted">{s.from_time.slice(0, 5)}</td>
                <td className="px-4 py-3 text-ink-muted">{s.to_time.slice(0, 5)}</td>
                <td className="px-4 py-3 text-ink-muted">{hoursPerDay(s.from_time.slice(0, 5), s.to_time.slice(0, 5))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add work shift" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Shift name *</label><input name="name" required placeholder="Morning Shift" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium text-ink">From *</label><input name="from" type="time" required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">To *</label><input name="to" type="time" required className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function JobSectionPage() {
  return (
    <Suspense fallback={null}>
      <JobSectionPageInner />
    </Suspense>
  );
}

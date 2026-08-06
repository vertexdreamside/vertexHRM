"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, ListPlus, Upload, Wallet, UserX, Plus, Trash2, Download, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const TABS = [
  { key: "optionalfields", label: "Optional Fields", icon: SlidersHorizontal },
  { key: "customfields", label: "Custom Fields", icon: ListPlus },
  { key: "dataimport", label: "Data Import", icon: Upload },
  { key: "reportingmethods", label: "Reporting Methods", icon: Wallet },
  { key: "terminationreasons", label: "Termination Reasons", icon: UserX }
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Loading() {
  return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium text-ink">{label}</label>{children}</div>;
}

function PimConfigurationPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "optionalfields");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">PIM Configuration</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Controls what appears on Employee records and how bulk changes happen.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm",
              activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-2xl">
        {activeTab === "optionalfields" && <OptionalFieldsTab />}
        {activeTab === "customfields" && <CustomFieldsTab />}
        {activeTab === "dataimport" && <DataImportTab />}
        {activeTab === "reportingmethods" && <GenericListTab table="reporting_methods" placeholder="e.g. Bank Transfer" />}
        {activeTab === "terminationreasons" && <GenericListTab table="termination_reasons" placeholder="e.g. Redundancy" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Optional Fields — now wired to a real table (was hardcoded seed data
// with no persistence before).
// ---------------------------------------------------------------------
interface OptionalFieldRow { key: string; label: string; visible: boolean }

function OptionalFieldsTab() {
  const supabase = createClient();
  const [fields, setFields] = useState<OptionalFieldRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("optional_fields").select("key, label, visible").order("label");
    setFields((data as OptionalFieldRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(key: string, visible: boolean) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, visible: !visible } : f)));
    await supabase.from("optional_fields").update({ visible: !visible }).eq("key", key);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Show or hide these fields on Employee &amp; My Info screens — they exist in the schema either way, this only
        controls visibility.
      </p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {fields.map((f, i) => (
          <label key={f.key} className={clsx("flex items-center justify-between px-4 py-3", i > 0 && "border-t border-surface-border")}>
            <span className="text-sm text-ink">{f.label}</span>
            <input type="checkbox" checked={f.visible} onChange={() => toggle(f.key, f.visible)} />
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Custom Fields — relocated here from Admin → Configuration per
// request (was the other way around: a placeholder here pointing out
// to the real thing in Admin). Same real custom_fields table.
// ---------------------------------------------------------------------
interface CustomFieldRow { id: string; label: string; applies_to: string; field_type: string; required: boolean }

function CustomFieldsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<CustomFieldRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldType, setFieldType] = useState("Text");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("custom_fields").select("id, label, applies_to, field_type, required").order("label");
    setFields((data as CustomFieldRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("custom_fields").insert({
      label: form.get("label"), applies_to: form.get("appliesTo"), field_type: fieldType, required: form.get("required") === "on"
    });
    setSaving(false);
    setAdding(false);
    setFieldType("Text");
    load();
  }

  async function remove(id: string) {
    await supabase.from("custom_fields").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add custom field</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? <Loading /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Field label</th><th className="px-4 py-3">Applies to</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Required</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{f.label}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.applies_to}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.field_type}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><button onClick={() => remove(f.id)} aria-label={`Delete ${f.label}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
              {fields.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No custom fields yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <Modal title="Add custom field" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Field label *"><input name="label" required className={inputCls} /></Field>
            <Field label="Applies to *">
              <select name="appliesTo" required className={inputCls} defaultValue="Employee"><option value="Employee">Employee</option><option value="Job Title">Job Title</option></select>
            </Field>
            <Field label="Field type *">
              <select className={inputCls} value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
                {["Text", "Number", "Date", "Dropdown", "Checkbox", "File"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="required" /> Required</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Data Import — added a downloadable sample CSV + field-requirement
// notes.
// ---------------------------------------------------------------------
function DataImportTab() {
  const [importFile, setImportFile] = useState<File | null>(null);

  function downloadSample() {
    const header = "employee_id,first_name,last_name,job_title,department,email,date_joined\n";
    const example = "EMP-010,Jane,Doe,HR Officer,Human Resources,jane.doe@vertexhrm.app,2026-01-15\n";
    const blob = new Blob([header + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-card border border-surface-border bg-white p-6">
      <p className="text-sm text-ink-muted">Bulk-create or update employee records from a CSV file.</p>

      <button onClick={downloadSample} className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
        <Download size={14} /> Download sample CSV
      </button>

      <div className="rounded-md bg-surface-subtle p-3 text-xs text-ink-muted">
        <p className="mb-1 font-medium text-ink">Field requirements</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li><code className="font-mono">employee_id</code> — required, must be unique</li>
          <li><code className="font-mono">first_name</code>, <code className="font-mono">last_name</code> — required</li>
          <li><code className="font-mono">job_title</code>, <code className="font-mono">department</code> — must match an existing entry in Job Section / Organization</li>
          <li><code className="font-mono">email</code> — required, must be a valid email address</li>
          <li><code className="font-mono">date_joined</code> — format YYYY-MM-DD</li>
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="importFile" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
          <Upload size={14} /> Choose CSV file
        </label>
        <input id="importFile" type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
        {importFile && <span className="text-xs text-ink-soft">{importFile.name}</span>}
      </div>
      <button disabled={!importFile} className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
        Preview import
      </button>
      <p className="text-xs text-ink-soft">
        Preview matches rows to existing employees by Employee ID before anything is written — no direct import
        without a review step. The actual row-parsing/preview logic isn&apos;t wired yet.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Generic add/delete list — used for both Reporting Methods and
// Termination Reasons, which are now real tables instead of local-only
// state (that local-only state is exactly why adding an entry looked
// like it "didn't work" — it vanished on refresh).
// ---------------------------------------------------------------------
interface ListRow { id: string; name: string }

function GenericListTab({ table, placeholder }: { table: string; placeholder: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from(table).select("id, name").order("name");
    setRows((data as ListRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table]);

  async function add() {
    if (!newName.trim()) return;
    const { error } = await supabase.from(table).insert({ name: newName.trim() });
    if (error) {
      alert(error.message.includes("duplicate") ? `"${newName}" already exists.` : error.message);
      return;
    }
    setNewName("");
    load();
  }

  async function remove(id: string) {
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={placeholder} className={inputCls} />
        <button onClick={add} className="flex items-center gap-1.5 rounded-md bg-state-success px-3 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={14} /> Add</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? <Loading /> : rows.map((r, i) => (
          <div key={r.id} className={clsx("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
            <span className="text-ink">{r.name}</span>
            <button onClick={() => remove(r.id)} className="text-ink-soft hover:text-state-danger"><Trash2 size={16} /></button>
          </div>
        ))}
        {!loading && rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-soft">Nothing here yet.</p>}
      </div>
    </div>
  );
}


export default function PimConfigurationPage() {
  return (
    <Suspense fallback={null}>
      <PimConfigurationPageInner />
    </Suspense>
  );
}

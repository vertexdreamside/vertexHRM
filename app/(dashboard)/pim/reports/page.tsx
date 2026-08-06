"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";
const SELECTION_FIELDS = ["Employee Name", "Pay Grade", "Job Title", "Department", "Employment Status", "Nationality"];
const DISPLAY_FIELDS = ["Employee ID", "Full Name", "Gender", "Nationality", "Job Title", "Department", "Email", "Phone", "Date Joined"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium text-ink">{label}</label>{children}</div>;
}

interface ReportRow { id: string; report_name: string; include_scope: string; display_fields: string[]; include_header: boolean; created_at: string }

export default function PimReportsPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [selectedDisplayFields, setSelectedDisplayFields] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("pim_reports").select("id, report_name, include_scope, display_fields, include_header, created_at").order("created_at", { ascending: false });
    setReports((data as ReportRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function openAdd() {
    setSelectedCriteria([]);
    setSelectedDisplayFields([]);
    setAdding(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("pim_reports").insert({
      report_name: form.get("reportName"),
      include_scope: form.get("includeScope"),
      selection_criteria: { fields: selectedCriteria },
      display_fields: selectedDisplayFields,
      include_header: form.get("includeHeader") === "on"
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("pim_reports").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">PIM Reports</h1>
          <p className="mt-1 text-sm text-ink-muted">Build custom employee reports — live from Supabase.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add report</button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : reports.map((r, i) => (
          <div key={r.id} className={clsx("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
            <div>
              <p className="font-medium text-ink">{r.report_name}</p>
              <p className="text-xs text-ink-soft">{r.display_fields.length} field(s) &middot; {r.include_scope} employees</p>
            </div>
            <button onClick={() => remove(r.id)} className="text-ink-soft hover:text-state-danger"><Trash2 size={16} /></button>
          </div>
        ))}
        {!loading && reports.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-soft">No reports yet.</p>}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Defines the report shape — actually generating/running it against live employee data isn&apos;t wired yet.</p>

      {adding && (
        <Modal title="Add report" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Report Name *"><input name="reportName" required className={inputCls} /></Field>

            <Field label="Selection Criteria">
              <div className="flex flex-wrap gap-1.5">
                {SELECTION_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedCriteria((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))}
                    className={clsx("rounded-full px-2.5 py-1 text-xs font-medium", selectedCriteria.includes(f) ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted")}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Include">
              <select name="includeScope" className={inputCls} defaultValue="current">
                <option value="current">Current Employees Only</option>
                <option value="past">Past Employees Only</option>
                <option value="both">Both</option>
              </select>
            </Field>

            <Field label="Display Fields">
              <div className="flex flex-wrap gap-1.5">
                {DISPLAY_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedDisplayFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))}
                    className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", selectedDisplayFields.includes(f) ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted")}
                  >
                    {!selectedDisplayFields.includes(f) && <Plus size={11} />} {f}
                  </button>
                ))}
              </div>
            </Field>

            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="includeHeader" defaultChecked /> Include Header</label>

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

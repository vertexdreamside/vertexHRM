"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Plus, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

interface EmployeeOption { id: string; full_name: string }
interface TemplateRow { id: string; name: string; type: "Onboarding" | "Offboarding" }
interface TemplateItemRow { id: string; template_id: string; task: string; sort_order: number }
interface AssignedTaskRow { id: string; employee_id: string; task: string; status: string; due_date: string | null; employees: { full_name: string } | { full_name: string }[] | null }

function one<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }

export default function OnboardingPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"templates" | "assigned">("templates");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItemRow[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTaskRow[]>([]);
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [empRes, tmplRes, itemRes, taskRes] = await Promise.all([
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("onboarding_templates").select("id, name, type").order("name"),
      supabase.from("onboarding_template_items").select("id, template_id, task, sort_order").order("sort_order"),
      supabase.from("employee_onboarding_tasks").select("id, employee_id, task, status, due_date, employees(full_name)").order("due_date")
    ]);
    setEmployees(empRes.data ?? []);
    setTemplates((tmplRes.data as TemplateRow[]) ?? []);
    setTemplateItems((itemRes.data as TemplateItemRow[]) ?? []);
    setAssignedTasks((taskRes.data as unknown as AssignedTaskRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function saveTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("onboarding_templates").insert({ name: form.get("name"), type: form.get("type") });
    setSaving(false); setAddingTemplate(false); load();
  }

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!addingItem) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const count = templateItems.filter((i) => i.template_id === addingItem).length;
    await supabase.from("onboarding_template_items").insert({ template_id: addingItem, task: form.get("task"), sort_order: count });
    setSaving(false); setAddingItem(null); load();
  }

  async function removeItem(id: string) {
    await supabase.from("onboarding_template_items").delete().eq("id", id);
    load();
  }

  async function assignTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const templateId = String(form.get("templateId"));
    const employeeId = String(form.get("employeeId"));
    const items = templateItems.filter((i) => i.template_id === templateId);
    if (items.length === 0) {
      alert("This template has no tasks yet — add at least one before assigning it.");
      return;
    }
    setSaving(true);
    await supabase.from("employee_onboarding_tasks").insert(
      items.map((i) => ({ employee_id: employeeId, template_id: templateId, task: i.task }))
    );
    setSaving(false); setAssigning(false); load();
  }

  async function toggleTask(id: string, status: string) {
    const newStatus = status === "Completed" ? "Pending" : "Completed";
    setAssignedTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    await supabase.from("employee_onboarding_tasks").update({ status: newStatus, completed_at: newStatus === "Completed" ? new Date().toISOString() : null }).eq("id", id);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Onboarding / Offboarding</h1>
      <p className="mt-1 text-sm text-ink-muted">Checklists — live from Supabase.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        <button onClick={() => setTab("templates")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "templates" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><UserPlus size={15} /> Templates</button>
        <button onClick={() => setTab("assigned")} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium", tab === "assigned" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}><UserMinus size={15} /> Assigned Checklists</button>
      </div>

      <div className="mt-6">
        {loading ? <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div> : (
          <>
            {tab === "templates" && (
              <div>
                <div className="mb-3 flex justify-end gap-2">
                  <button onClick={() => setAssigning(true)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Assign to employee</button>
                  <button onClick={() => setAddingTemplate(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New template</button>
                </div>
                <div className="space-y-4">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-card border border-surface-border bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium text-ink">{t.name} <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{t.type}</span></p>
                        <button onClick={() => setAddingItem(t.id)} className="text-xs font-medium text-brand-700 hover:underline">+ Add task</button>
                      </div>
                      <ul className="space-y-1">
                        {templateItems.filter((i) => i.template_id === t.id).map((i) => (
                          <li key={i.id} className="flex items-center justify-between text-sm text-ink-muted">
                            <span>{i.task}</span>
                            <button onClick={() => removeItem(i.id)} className="text-ink-soft hover:text-state-danger"><Trash2 size={13} /></button>
                          </li>
                        ))}
                        {templateItems.filter((i) => i.template_id === t.id).length === 0 && <li className="text-sm text-ink-soft">No tasks yet.</li>}
                      </ul>
                    </div>
                  ))}
                  {templates.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No templates yet.</p>}
                </div>
              </div>
            )}

            {tab === "assigned" && (
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody>
                    {assignedTasks.map((t) => (
                      <tr key={t.id} className="border-t border-surface-border">
                        <td className="px-4 py-3 font-medium text-ink">{one(t.employees)?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-ink-muted">{t.task}</td>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={t.status === "Completed"} onChange={() => toggleTask(t.id, t.status)} />
                            <span className={t.status === "Completed" ? "text-state-success" : "text-ink-soft"}>{t.status}</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                    {assignedTasks.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">No checklists assigned yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {addingTemplate && (
        <Modal title="New template" onClose={() => setAddingTemplate(false)}>
          <form onSubmit={saveTemplate} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Type *</label><select name="type" required className={inputCls}><option value="Onboarding">Onboarding</option><option value="Offboarding">Offboarding</option></select></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingTemplate(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}

      {addingItem && (
        <Modal title="Add task" onClose={() => setAddingItem(null)}>
          <form onSubmit={saveItem} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Task *</label><input name="task" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAddingItem(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}

      {assigning && (
        <Modal title="Assign checklist to employee" onClose={() => setAssigning(false)}>
          <form onSubmit={assignTemplate} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Template *</label><select name="templateId" required className={inputCls}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}</select></div>
            <p className="text-xs text-ink-soft">Copies every task from the template as a fresh checklist for this employee.</p>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAssigning(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Assign</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

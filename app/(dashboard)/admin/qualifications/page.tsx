"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Lightbulb,
  GraduationCap,
  Award,
  Languages as LanguagesIcon,
  Users2,
  Flag,
  Plus,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { QualificationListType } from "@/lib/types";

// All six lists share one shape (name + optional description) and one
// table (qualification_items, list_type column) — see the note on this
// in vertex-core-data-model.md. Same generic component as before, now
// reading/writing the real table instead of local seed data.

const TABS: {
  key: QualificationListType;
  label: string;
  icon: typeof Lightbulb;
  withDescription: boolean;
}[] = [
  { key: "skills", label: "Skills", icon: Lightbulb, withDescription: true },
  { key: "education", label: "Education", icon: GraduationCap, withDescription: false },
  { key: "certificates", label: "Certificates", icon: Award, withDescription: false },
  { key: "languages", label: "Languages", icon: LanguagesIcon, withDescription: false },
  { key: "memberships", label: "Memberships", icon: Users2, withDescription: false },
  { key: "nationalities", label: "Nationalities", icon: Flag, withDescription: false }
];

function QualificationsPageInner() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as QualificationListType) || "skills";
  const [activeTab, setActiveTab] = useState<QualificationListType>(initialTab);
  const activeMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Qualifications</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Reference lists used on employee profiles — live from Supabase.
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
        <QualificationListTab key={activeTab} listType={activeTab} label={activeMeta.label} withDescription={activeMeta.withDescription} />
      </div>
    </div>
  );
}

interface QualificationRow {
  id: string;
  name: string;
  description: string | null;
}

function QualificationListTab({
  listType,
  label,
  withDescription
}: {
  listType: QualificationListType;
  label: string;
  withDescription: boolean;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QualificationRow[]>([]);
  const [editing, setEditing] = useState<QualificationRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("qualification_items")
      .select("id, name, description")
      .eq("list_type", listType)
      .order("name");
    setItems((data as QualificationRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listType]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const description = withDescription ? String(form.get("description")) : null;

    if (editing === "new") {
      const { error } = await supabase.from("qualification_items").insert({ list_type: listType, name, description });
      if (error) {
        alert(error.message.includes("duplicate") ? `"${name}" already exists in ${label}.` : error.message);
        setSaving(false);
        return;
      }
    } else if (editing) {
      await supabase.from("qualification_items").update({ name, description }).eq("id", editing.id);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${label.toLowerCase()} entry?`)) return;
    const { error } = await supabase.from("qualification_items").delete().eq("id", id);
    if (error) {
      alert(`Couldn't delete — it may still be referenced by an employee: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              {withDescription && <th className="px-4 py-3">Description</th>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={withDescription ? 3 : 2} className="px-4 py-16 text-center text-sm text-ink-soft"><Loader2 size={16} className="mx-auto animate-spin" /></td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
                {withDescription && <td className="px-4 py-3 text-ink-muted">{item.description || "—"}</td>}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Pencil size={16} /></button>
                    <button onClick={() => remove(item.id)} aria-label={`Delete ${item.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={withDescription ? 3 : 2} className="px-4 py-10 text-center text-sm text-ink-soft">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal title={editing === "new" ? `Add ${label.toLowerCase()}` : `Edit ${label.toLowerCase()}`} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Name *</label>
              <input name="name" required defaultValue={editingRecord?.name} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            {withDescription && (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Description</label>
                <textarea name="description" rows={3} defaultValue={editingRecord?.description ?? ""} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function QualificationsPage() {
  return (
    <Suspense fallback={null}>
      <QualificationsPageInner />
    </Suspense>
  );
}

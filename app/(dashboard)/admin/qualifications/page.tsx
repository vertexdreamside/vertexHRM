"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
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
  Trash2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { QualificationItem, QualificationListType } from "@/lib/types";

// All six lists share one shape (name + optional description), so this
// module is one generic component parameterized per list rather than
// six near-identical screens — see vertex-core-data-model.md's note on
// generalizing qualification_lists/qualification_items.

const SEED: Record<QualificationListType, QualificationItem[]> = {
  skills: [
    { id: "1", name: "Project Management", description: "" },
    { id: "2", name: "Bookkeeping", description: "" }
  ],
  education: [
    { id: "1", name: "Secondary Certificate" },
    { id: "2", name: "Diploma" },
    { id: "3", name: "Bachelor's Degree" },
    { id: "4", name: "Master's" }
  ],
  certificates: [
    { id: "1", name: "Digital Marketing" },
    { id: "2", name: "Cisco Certified Network Associate" }
  ],
  languages: [
    { id: "1", name: "English" },
    { id: "2", name: "French" },
    { id: "3", name: "Creole" }
  ],
  memberships: [
    { id: "1", name: "ACCA" },
    { id: "2", name: "Chartered Institute" }
  ],
  nationalities: [
    { id: "1", name: "Seychellois" },
    { id: "2", name: "Indian" },
    { id: "3", name: "Sri Lankan" }
  ]
};

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
      <h1 className="font-display text-2xl font-medium text-ink">
        Qualifications
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Reference lists used on employee profiles — one generic list
        pattern behind all six tabs.
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
        <QualificationListTab
          key={activeTab} // reset local state cleanly when switching tabs
          listType={activeTab}
          label={activeMeta.label}
          withDescription={activeMeta.withDescription}
        />
      </div>
    </div>
  );
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
  const [items, setItems] = useState<QualificationItem[]>(SEED[listType]);
  const [editing, setEditing] = useState<QualificationItem | "new" | null>(null);
  const editingRecord = editing !== "new" ? editing : null;

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const description = withDescription ? String(form.get("description")) : undefined;

    if (editing === "new") {
      setItems((prev) => [...prev, { id: crypto.randomUUID(), name, description }]);
      // TODO(supabase): insert into `qualification_items`
      //   with list_type = '${listType}' (see vertex-core-data-model.md §2)
    } else if (editing) {
      setItems((prev) =>
        prev.map((i) => (i.id === editing.id ? { ...i, name, description } : i))
      );
    }
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm(`Delete this ${label.toLowerCase()} entry?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    // TODO(supabase): delete from `qualification_items` where id = ...
    // Consider blocking delete (or soft-delete) if referenced by an
    // employee record, rather than a hard delete that orphans it.
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
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
            {items.map((item) => (
              <tr key={item.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
                {withDescription && (
                  <td className="px-4 py-3 text-ink-muted">
                    {item.description || "—"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(item)}
                      aria-label={`Edit ${item.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={withDescription ? 3 : 2} className="px-4 py-10 text-center text-sm text-ink-soft">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal
          title={editing === "new" ? `Add ${label.toLowerCase()}` : `Edit ${label.toLowerCase()}`}
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
            {withDescription && (
              <div>
                <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={editingRecord?.description}
                  className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
            )}
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

export default function QualificationsPage() {
  return (
    <Suspense fallback={null}>
      <QualificationsPageInner />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { MODULES, ROLE_SEED, type AppRole } from "@/lib/roleSeedData";
import type { ModulePermission } from "@/lib/types";

const ACTIONS: (keyof ModulePermission)[] = [
  "view",
  "add",
  "edit",
  "delete",
  "approve"
];

const ACTION_LABELS: Record<keyof ModulePermission, string> = {
  view: "View",
  add: "Add",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve"
};

export default function RolesPage() {
  const [roles, setRoles] = useState<AppRole[]>(ROLE_SEED);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<Record<
    string,
    ModulePermission
  > | null>(null);

  const editingRole = roles.find((r) => r.id === editingModuleId) ?? null;

  function startEditing(role: AppRole) {
    setDraftPermissions(structuredClone(role.permissions));
    setEditingModuleId(role.id);
  }

  function togglePermission(moduleKey: string, action: keyof ModulePermission) {
    setDraftPermissions((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          [action]: !prev[moduleKey][action]
        }
      };
    });
  }

  function savePermissions() {
    if (!editingRole || !draftPermissions) return;
    setRoles((prev) =>
      prev.map((r) =>
        r.id === editingRole.id ? { ...r, permissions: draftPermissions } : r
      )
    );
    setEditingModuleId(null);
    setDraftPermissions(null);
    // TODO(supabase): upsert one row per (role_id, module) into
    // role_permissions — see supabase/migrations/0001_core_schema.sql
    // and the seed pattern in 0003_seed_role_permissions.sql.
    // Also write an audit_log entry: action = 'Permission Change'.
  }

  function cancelEditing() {
    setEditingModuleId(null);
    setDraftPermissions(null);
  }

  function createRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const description = String(form.get("description"));

    const emptyPermissions = Object.fromEntries(
      MODULES.map((m) => [
        m.key,
        { view: false, add: false, edit: false, delete: false, approve: false }
      ])
    );

    const newRole: AppRole = {
      id: crypto.randomUUID(),
      name,
      description,
      isSystem: false,
      userCount: 0,
      permissions: emptyPermissions
    };

    setRoles((prev) => [...prev, newRole]);
    setNewRoleOpen(false);
    // TODO(supabase): insert into roles, then insert one zeroed row per
    // module into role_permissions for this new role_id.
  }

  function deleteRole(role: AppRole) {
    if (role.isSystem) return;
    if (!confirm(`Delete the "${role.name}" role? Users with this role keep their account but lose all access until reassigned.`)) {
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    // TODO(supabase): supabase.from('roles').delete().eq('id', role.id)
    // (role_permissions rows cascade via the FK in migration 0001)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">
            Roles &amp; Permissions
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            What each role can see and do, per module. The starter set below
            comes from the Access Levels doc — edit freely except the two
            system roles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewRoleOpen(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add role
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Role name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Users assigned</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">
                  <div className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <span
                        title="System role — cannot be deleted"
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                      >
                        <ShieldCheck size={12} /> System
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{role.description}</td>
                <td className="px-4 py-3 text-ink-muted">{role.userCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => startEditing(role)}
                      aria-label={`Edit permissions for ${role.name}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => deleteRole(role)}
                        aria-label={`Delete ${role.name}`}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission matrix — expands inline below the table rather than a
          cramped modal, since it's a 16-module x 5-action grid. */}
      {editingRole && draftPermissions && (
        <div className="mt-4 rounded-card border border-brand-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">
                {editingRole.name} — permissions
              </h2>
              <p className="text-sm text-ink-muted">
                Approve applies within a person&apos;s own department/team,
                enforced separately in each module — this grid only controls
                whether the role can approve at all.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelEditing}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                onClick={savePermissions}
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Module</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-3 py-2 text-center">
                      {ACTION_LABELS[action]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.key} className="border-t border-surface-border">
                    <td className="px-3 py-2 text-ink">{mod.label}</td>
                    {ACTIONS.map((action) => (
                      <td key={action} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${mod.label} — ${ACTION_LABELS[action]}`}
                          checked={draftPermissions[mod.key]?.[action] ?? false}
                          onChange={() => togglePermission(mod.key, action)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {newRoleOpen && (
        <Modal title="Add role" onClose={() => setNewRoleOpen(false)}>
          <form onSubmit={createRole} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                Role name *
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            <p className="text-xs text-ink-soft">
              Every module starts with no access — set permissions after
              creating the role.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewRoleOpen(false)}
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

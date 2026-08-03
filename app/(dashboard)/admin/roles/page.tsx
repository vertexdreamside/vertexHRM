"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { MODULES } from "@/lib/roleSeedData";
import type { ModulePermission } from "@/lib/types";

interface RoleRow {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: Record<string, ModulePermission>;
}

const ACTIONS: (keyof ModulePermission)[] = ["view", "add", "edit", "delete", "approve"];
const ACTION_LABELS: Record<keyof ModulePermission, string> = {
  view: "View", add: "Add", edit: "Edit", delete: "Delete", approve: "Approve"
};
const EMPTY_PERMISSION: ModulePermission = { view: false, add: false, edit: false, delete: false, approve: false };

export default function RolesPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, ModulePermission> | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);

    const [rolesRes, permsRes, usersRes] = await Promise.all([
      supabase.from("roles").select("id, name, description, is_system").order("name"),
      supabase.from("role_permissions").select("role_id, module, can_view, can_add, can_edit, can_delete, can_approve"),
      supabase.from("app_users").select("role_id")
    ]);

    if (rolesRes.error) {
      setLoadError(rolesRes.error.message);
      setLoading(false);
      return;
    }

    const userCounts = new Map<string, number>();
    for (const u of usersRes.data ?? []) {
      userCounts.set(u.role_id, (userCounts.get(u.role_id) ?? 0) + 1);
    }

    const permsByRole = new Map<string, Record<string, ModulePermission>>();
    for (const p of permsRes.data ?? []) {
      const roleMap = permsByRole.get(p.role_id) ?? {};
      roleMap[p.module] = {
        view: p.can_view, add: p.can_add, edit: p.can_edit, delete: p.can_delete, approve: p.can_approve
      };
      permsByRole.set(p.role_id, roleMap);
    }

    const mapped: RoleRow[] = (rolesRes.data ?? []).map((r) => {
      const rolePerms = permsByRole.get(r.id) ?? {};
      const permissions: Record<string, ModulePermission> = {};
      for (const m of MODULES) {
        permissions[m.key] = rolePerms[m.key] ?? { ...EMPTY_PERMISSION };
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        isSystem: r.is_system,
        userCount: userCounts.get(r.id) ?? 0,
        permissions
      };
    });

    setRoles(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editingRole = roles.find((r) => r.id === editingRoleId) ?? null;

  function startEditing(role: RoleRow) {
    setDraftPermissions(structuredClone(role.permissions));
    setEditingRoleId(role.id);
  }

  function togglePermission(moduleKey: string, action: keyof ModulePermission) {
    setDraftPermissions((prev) => {
      if (!prev) return prev;
      return { ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } };
    });
  }

  async function savePermissions() {
    if (!editingRole || !draftPermissions) return;
    setSavingPermissions(true);

    const rows = MODULES.map((m) => ({
      role_id: editingRole.id,
      module: m.key,
      can_view: draftPermissions[m.key].view,
      can_add: draftPermissions[m.key].add,
      can_edit: draftPermissions[m.key].edit,
      can_delete: draftPermissions[m.key].delete,
      can_approve: draftPermissions[m.key].approve
    }));

    const { error } = await supabase.from("role_permissions").upsert(rows, { onConflict: "role_id,module" });

    setSavingPermissions(false);
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    // TODO: write an audit_log row here — action: 'Permission Change'.

    setEditingRoleId(null);
    setDraftPermissions(null);
    loadAll();
  }

  function cancelEditing() {
    setEditingRoleId(null);
    setDraftPermissions(null);
  }

  async function createRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const description = String(form.get("description"));

    const { data: newRole, error: insertError } = await supabase
      .from("roles")
      .insert({ name, description, is_system: false })
      .select("id")
      .single();

    if (insertError || !newRole) {
      setCreateError(insertError?.message ?? "Failed to create role");
      setCreating(false);
      return;
    }

    const zeroedRows = MODULES.map((m) => ({
      role_id: newRole.id,
      module: m.key,
      can_view: false, can_add: false, can_edit: false, can_delete: false, can_approve: false
    }));
    const { error: permsError } = await supabase.from("role_permissions").insert(zeroedRows);
    if (permsError) {
      setCreateError(permsError.message);
      setCreating(false);
      return;
    }

    setCreating(false);
    setNewRoleOpen(false);
    loadAll();
  }

  async function deleteRole(role: RoleRow) {
    if (role.isSystem) return;
    if (role.userCount > 0) {
      alert(`Can't delete "${role.name}" — ${role.userCount} user(s) still have this role. Reassign them first.`);
      return;
    }
    if (!confirm(`Delete the "${role.name}" role?`)) return;

    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    if (error) {
      alert(`Couldn't delete: ${error.message}`);
      return;
    }
    loadAll();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-ink-muted">
            What each role can see and do, per module — live from Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewRoleOpen(true)}
          className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add role
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-card border border-state-danger/30 bg-state-dangerBg p-4 text-sm text-state-danger">
          Couldn&apos;t load roles: {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-ink-soft">
            <Loader2 size={16} className="animate-spin" /> Loading roles…
          </div>
        ) : (
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
                        <span title="System role — cannot be deleted" className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          <ShieldCheck size={12} /> System
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{role.description}</td>
                  <td className="px-4 py-3 text-ink-muted">{role.userCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEditing(role)} aria-label={`Edit permissions for ${role.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700">
                        <Pencil size={16} />
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => deleteRole(role)} aria-label={`Delete ${role.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingRole && draftPermissions && (
        <div className="mt-4 rounded-card border border-brand-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">{editingRole.name} — permissions</h2>
              <p className="text-sm text-ink-muted">
                Approve applies within a person&apos;s own department/team, enforced separately in each module.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelEditing} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                Cancel
              </button>
              <button
                onClick={savePermissions}
                disabled={savingPermissions}
                className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {savingPermissions && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Module</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-3 py-2 text-center">{ACTION_LABELS[action]}</th>
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
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">Role name *</label>
              <input id="name" name="name" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-ink">Description</label>
              <textarea id="description" name="description" rows={3} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <p className="text-xs text-ink-soft">Every module starts with no access — set permissions after creating the role.</p>
            {createError && <p className="text-sm text-state-danger">{createError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewRoleOpen(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {creating && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

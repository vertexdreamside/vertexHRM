"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Ban, CheckCircle2, Plus, Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AppUser, Role, UserStatus } from "@/lib/types";

// TODO(supabase): replace this seed data with a query against the
// shared `users` table (joined to `employees` and `roles`) —
// see supabase/migrations/0001_core_schema.sql and
// vertex-core-data-model.md §1 for the shape this maps to.
const SEED_USERS: AppUser[] = [
  {
    id: "1",
    username: "j.esparon",
    employeeName: "Jules Esparon",
    role: "HR Manager",
    status: "enabled",
    createdAt: "2026-02-10"
  },
  {
    id: "2",
    username: "m.dubel",
    employeeName: "Marie Dubel",
    role: "Department Manager",
    status: "enabled",
    createdAt: "2026-03-02"
  },
  {
    id: "3",
    username: "s.pillay",
    employeeName: "Selvan Pillay",
    role: "IT Officer",
    status: "disabled",
    createdAt: "2026-01-18"
  }
];

const ROLES: Role[] = [
  "System Administrator",
  "HR Manager",
  "HR Officer",
  "Department Manager",
  "Supervisor",
  "IT Officer",
  "Procurement Officer",
  "Finance Officer",
  "Office Administrator",
  "Employee",
  "Auditor"
];

const emptyDraft: Omit<AppUser, "id" | "createdAt"> = {
  username: "",
  employeeName: "",
  role: "Employee",
  status: "enabled"
};

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalUser, setModalUser] = useState<AppUser | "new" | null>(null);
  const [changePassword, setChangePassword] = useState(false);

  // Search / filter panel state — §1.1 Search / Filter Panel
  const [filters, setFilters] = useState({
    username: "",
    role: "" as Role | "",
    employeeName: "",
    status: "" as UserStatus | ""
  });

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (
        filters.username &&
        !u.username.toLowerCase().includes(filters.username.toLowerCase())
      )
        return false;
      if (filters.role && u.role !== filters.role) return false;
      if (
        filters.employeeName &&
        !u.employeeName
          .toLowerCase()
          .includes(filters.employeeName.toLowerCase())
      )
        return false;
      if (filters.status && u.status !== filters.status) return false;
      return true;
    });
  }, [users, filters]);

  function resetFilters() {
    setFilters({ username: "", role: "", employeeName: "", status: "" });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((u) => u.id))
    );
  }

  // Bulk actions — §1.1 Bulk Actions
  function bulkSetStatus(status: UserStatus) {
    setUsers((prev) =>
      prev.map((u) => (selected.has(u.id) ? { ...u, status } : u))
    );
    setSelected(new Set());
    // TODO(supabase): supabase.from('users').update({ status }).in('id', [...selected])
  }

  function bulkDelete() {
    if (!confirm(`Delete ${selected.size} selected user(s)? This can't be undone.`)) {
      return;
    }
    setUsers((prev) => prev.filter((u) => !selected.has(u.id)));
    setSelected(new Set());
    // TODO(supabase): supabase.from('users').delete().in('id', [...selected])
    // TODO: this action must also write to audit_log (§5.10 in the spec)
  }

  function exportCsv() {
    const rows = filtered.map((u) => [
      u.username,
      u.role,
      u.employeeName,
      u.status
    ]);
    const csv = [
      ["Username", "User Role", "Employee Name", "Status"],
      ...rows
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEdit(user: AppUser) {
    setChangePassword(false);
    setModalUser(user);
  }

  function openNew() {
    setChangePassword(false);
    setModalUser("new");
  }

  function saveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username"));
    const employeeName = String(form.get("employeeName"));
    const role = form.get("role") as Role;
    const status = form.get("status") as UserStatus;

    if (modalUser === "new") {
      const newUser: AppUser = {
        id: crypto.randomUUID(),
        username,
        employeeName,
        role,
        status,
        createdAt: new Date().toISOString().slice(0, 10)
      };
      setUsers((prev) => [newUser, ...prev]);
      // TODO(supabase): supabase.from('users').insert({...})
      //   then supabase.auth.admin.createUser({...}) for the auth account
    } else if (modalUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === modalUser.id
            ? { ...u, username, employeeName, role, status }
            : u
        )
      );
      // TODO(supabase): supabase.from('users').update({...}).eq('id', modalUser.id)
      // if (changePassword) supabase.auth.admin.updateUserById(id, { password })
    }

    setModalUser(null);
  }

  function deleteUser(id: string) {
    if (!confirm("Delete this user? This can't be undone.")) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    // TODO(supabase): supabase.from('users').delete().eq('id', id)
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "enabled" ? "disabled" : "enabled" }
          : u
      )
    );
    // TODO(supabase): supabase.from('users').update({ status }).eq('id', id)
    // Disabling should also force-logout active sessions per spec §5.9.
  }

  const editing = modalUser !== null && modalUser !== "new" ? modalUser : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-muted">
            System accounts and their roles. See{" "}
            <span className="font-medium">Roles &amp; Permissions</span> to
            change what a role can access.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      {/* Search / Filter Panel */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-card border border-surface-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          placeholder="Username"
          value={filters.username}
          onChange={(e) =>
            setFilters((f) => ({ ...f, username: e.target.value }))
          }
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        />
        <select
          value={filters.role}
          onChange={(e) =>
            setFilters((f) => ({ ...f, role: e.target.value as Role | "" }))
          }
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          placeholder="Employee name"
          value={filters.employeeName}
          onChange={(e) =>
            setFilters((f) => ({ ...f, employeeName: e.target.value }))
          }
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: e.target.value as UserStatus | ""
            }))
          }
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        >
          <option value="">Any status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
        >
          Reset
        </button>
      </div>

      {/* Bulk actions bar — only visible with a selection */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-card border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-brand-700">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkSetStatus("enabled")}
              className="rounded-md px-3 py-1.5 text-state-success hover:bg-white"
            >
              Enable
            </button>
            <button
              onClick={() => bulkSetStatus("disabled")}
              className="rounded-md px-3 py-1.5 text-state-warning hover:bg-white"
            >
              Disable
            </button>
            <button
              onClick={bulkDelete}
              className="rounded-md px-3 py-1.5 text-state-danger hover:bg-white"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
          <span className="text-xs text-ink-soft">
            {filtered.length} user{filtered.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">User role</th>
              <th className="px-4 py-3">Employee name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-surface-border">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.username}`}
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelected(u.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-ink">
                  {u.username}
                </td>
                <td className="px-4 py-3 text-ink-muted">{u.role}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {u.employeeName}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      aria-label={`Edit ${u.username}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => toggleStatus(u.id)}
                      aria-label={
                        u.status === "enabled"
                          ? `Disable ${u.username}`
                          : `Enable ${u.username}`
                      }
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-warning"
                    >
                      {u.status === "enabled" ? (
                        <Ban size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      aria-label={`Delete ${u.username}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalUser !== null && (
        <Modal
          title={modalUser === "new" ? "Add user" : "Edit user"}
          onClose={() => setModalUser(null)}
        >
          <form onSubmit={saveUser} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-ink">
                Username *
              </label>
              <input
                id="username"
                name="username"
                required
                defaultValue={editing?.username}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-ink">
                User role *
              </label>
              <select
                id="role"
                name="role"
                required
                defaultValue={editing?.role ?? emptyDraft.role}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employeeName" className="mb-1 block text-sm font-medium text-ink">
                Employee name *
              </label>
              <input
                id="employeeName"
                name="employeeName"
                required
                defaultValue={editing?.employeeName}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink">
                Status *
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue={editing?.status ?? emptyDraft.status}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {editing && (
              <div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                  />
                  Change password
                </label>
                {changePassword && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New password"
                      className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                    />
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm password"
                      className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalUser(null)}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Ban, CheckCircle2, Plus, Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

interface RoleOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface UserRow {
  id: string;
  username: string;
  status: "enabled" | "disabled";
  role_id: string;
  employee_id: string | null;
  roleName: string;
  employeeName: string;
}

export default function UsersPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalUser, setModalUser] = useState<UserRow | "new" | null>(null);
  const [changePassword, setChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    username: "",
    roleId: "",
    employeeName: "",
    status: ""
  });

  async function loadAll() {
    setLoading(true);
    setLoadError(null);

    const [usersRes, rolesRes, employeesRes] = await Promise.all([
      supabase
        .from("app_users")
        .select("id, username, status, role_id, employee_id, roles(name), employees(full_name)")
        .order("username"),
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("employees").select("id, full_name").order("full_name")
    ]);

    if (usersRes.error) {
      setLoadError(usersRes.error.message);
      setLoading(false);
      return;
    }

    setRoles((rolesRes.data as RoleOption[]) ?? []);
    setEmployees((employeesRes.data as EmployeeOption[]) ?? []);

    type RawUserRow = {
      id: string;
      username: string;
      status: "enabled" | "disabled";
      role_id: string;
      employee_id: string | null;
      roles: { name: string } | { name: string }[] | null;
      employees: { full_name: string } | { full_name: string }[] | null;
    };

    const mapped: UserRow[] = ((usersRes.data as RawUserRow[]) ?? []).map((u) => {
      const role = Array.isArray(u.roles) ? u.roles[0] : u.roles;
      const employee = Array.isArray(u.employees) ? u.employees[0] : u.employees;
      return {
        id: u.id,
        username: u.username,
        status: u.status,
        role_id: u.role_id,
        employee_id: u.employee_id,
        roleName: role?.name ?? "—",
        employeeName: employee?.full_name ?? "—"
      };
    });

    setUsers(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filters.username && !u.username.toLowerCase().includes(filters.username.toLowerCase())) return false;
      if (filters.roleId && u.role_id !== filters.roleId) return false;
      if (filters.employeeName && !u.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase())) return false;
      if (filters.status && u.status !== filters.status) return false;
      return true;
    });
  }, [users, filters]);

  function resetFilters() {
    setFilters({ username: "", roleId: "", employeeName: "", status: "" });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id))));
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error);
    }
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error);
    }
  }

  async function bulkSetStatus(status: "enabled" | "disabled") {
    const ids = [...selected];
    setSelected(new Set());
    await Promise.all(ids.map((id) => patchUser(id, { status }).catch(() => null)));
    loadAll();
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} selected user(s)? This can't be undone.`)) return;
    const ids = [...selected];
    setSelected(new Set());
    await Promise.all(ids.map((id) => deleteUser(id).catch(() => null)));
    loadAll();
  }

  function exportCsv() {
    const rows = filtered.map((u) => [u.username, u.roleName, u.employeeName, u.status]);
    const csv = [["Username", "User Role", "Employee Name", "Status"], ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEdit(user: UserRow) {
    setChangePassword(false);
    setFormError(null);
    setModalUser(user);
  }

  function openNew() {
    setChangePassword(false);
    setFormError(null);
    setModalUser("new");
  }

  async function saveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);

    try {
      if (modalUser === "new") {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("newPassword"),
            username: form.get("username"),
            roleId: form.get("roleId"),
            employeeId: form.get("employeeId") || null,
            status: form.get("status")
          })
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error);
        }
      } else if (modalUser) {
        await patchUser(modalUser.id, {
          username: form.get("username"),
          roleId: form.get("roleId"),
          employeeId: form.get("employeeId") || null,
          status: form.get("status"),
          newPassword: changePassword ? form.get("newPassword") : undefined
        });
      }
      setModalUser(null);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user? This can't be undone.")) return;
    try {
      await deleteUser(id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function toggleStatus(user: UserRow) {
    try {
      await patchUser(user.id, { status: user.status === "enabled" ? "disabled" : "enabled" });
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const editing = modalUser !== null && modalUser !== "new" ? modalUser : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-muted">
            System accounts and their roles — live data from Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-card border border-surface-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          placeholder="Username"
          value={filters.username}
          onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        />
        <select
          value={filters.roleId}
          onChange={(e) => setFilters((f) => ({ ...f, roleId: e.target.value }))}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <input
          placeholder="Employee name"
          value={filters.employeeName}
          onChange={(e) => setFilters((f) => ({ ...f, employeeName: e.target.value }))}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
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

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-card border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-brand-700">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => bulkSetStatus("enabled")} className="rounded-md px-3 py-1.5 text-state-success hover:bg-white">Enable</button>
            <button onClick={() => bulkSetStatus("disabled")} className="rounded-md px-3 py-1.5 text-state-warning hover:bg-white">Disable</button>
            <button onClick={bulkDelete} className="rounded-md px-3 py-1.5 text-state-danger hover:bg-white">Delete</button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-card border border-state-danger/30 bg-state-dangerBg p-4 text-sm text-state-danger">
          Couldn&apos;t load users: {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
          <span className="text-xs text-ink-soft">
            {loading ? "Loading…" : `${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
          </span>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-ink-soft">
            <Loader2 size={16} className="animate-spin" /> Loading users…
          </div>
        ) : (
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
                    <input type="checkbox" aria-label={`Select ${u.username}`} checked={selected.has(u.id)} onChange={() => toggleSelected(u.id)} />
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{u.username}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.roleName}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.employeeName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${u.status === "enabled" ? "bg-state-successBg text-state-success" : "bg-state-dangerBg text-state-danger"}`}>
                      {u.status === "enabled" ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} aria-label={`Edit ${u.username}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => toggleStatus(u)} aria-label={u.status === "enabled" ? `Disable ${u.username}` : `Enable ${u.username}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-warning">
                        {u.status === "enabled" ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button onClick={() => handleDelete(u.id)} aria-label={`Delete ${u.username}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No users match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalUser !== null && (
        <Modal title={modalUser === "new" ? "Add user" : "Edit user"} onClose={() => setModalUser(null)}>
          <form onSubmit={saveUser} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-ink">Username *</label>
              <input id="username" name="username" required defaultValue={editing?.username} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>

            {modalUser === "new" && (
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">Email *</label>
                <input id="email" name="email" type="email" required className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
              </div>
            )}

            <div>
              <label htmlFor="roleId" className="mb-1 block text-sm font-medium text-ink">User role *</label>
              <select id="roleId" name="roleId" required defaultValue={editing?.role_id ?? roles[0]?.id} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500">
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-ink">Employee</label>
              <select id="employeeId" name="employeeId" defaultValue={editing?.employee_id ?? ""} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500">
                <option value="">— No employee record linked —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-soft">Create the person in PIM first if they&apos;re not listed.</p>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink">Status *</label>
              <select id="status" name="status" required defaultValue={editing?.status ?? "enabled"} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500">
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {modalUser === "new" ? (
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-ink">Temporary password *</label>
                <input id="newPassword" name="newPassword" type="password" required minLength={8} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
                  Change password
                </label>
                {changePassword && (
                  <input name="newPassword" type="password" placeholder="New password" minLength={8} className="mt-2 w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
                )}
              </div>
            )}

            {formError && <p className="text-sm text-state-danger">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalUser(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

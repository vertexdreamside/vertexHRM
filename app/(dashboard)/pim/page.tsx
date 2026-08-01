"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import type { PimEmployee } from "@/lib/types";

// TODO(supabase): this is the actual `employees` write surface — Users
// (§1.1) links to employee_id, Directory reads from here read-only, and
// Roles/Approvals all ultimately trace back to a row created here.
const SEED_EMPLOYEES: PimEmployee[] = [
  {
    id: "1", employeeId: "EMP-001", fullName: "Jules Esparon", dateOfBirth: "1985-03-14",
    gender: "Male", maritalStatus: "Married", nationality: "Seychellois",
    jobTitle: "HR Manager", department: "HR", employmentStatus: "Full-Time Permanent",
    dateJoined: "2019-06-01", status: "Active", email: "j.esparon@vertexhrm.app",
    phone: "+248 2 500 001", address: "Victoria, Mahé",
    emergencyContactName: "R. Esparon", emergencyContactPhone: "+248 2 500 099",
    emergencyContactRelationship: "Spouse"
  },
  {
    id: "2", employeeId: "EMP-002", fullName: "Marie Dubel", dateOfBirth: "1990-11-02",
    gender: "Female", maritalStatus: "Single", nationality: "Seychellois",
    jobTitle: "Operations Manager", department: "Operations", employmentStatus: "Full-Time Permanent",
    dateJoined: "2021-02-15", status: "Active", email: "m.dubel@vertexhrm.app",
    phone: "+248 2 500 002", address: "Beau Vallon, Mahé",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: ""
  }
];

const inputCls =
  "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function PimPageInner() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<PimEmployee[]>(SEED_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PimEmployee | "new" | null>(null);
  const editingRecord = editing !== "new" ? editing : null;

  useEffect(() => {
    if (searchParams.get("new") === "1") setEditing("new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const record: Omit<PimEmployee, "id"> = {
      employeeId: String(form.get("employeeId")),
      fullName: String(form.get("fullName")),
      dateOfBirth: String(form.get("dateOfBirth")),
      gender: form.get("gender") as PimEmployee["gender"],
      maritalStatus: form.get("maritalStatus") as PimEmployee["maritalStatus"],
      nationality: String(form.get("nationality")),
      jobTitle: String(form.get("jobTitle")),
      department: String(form.get("department")),
      employmentStatus: String(form.get("employmentStatus")),
      dateJoined: String(form.get("dateJoined")),
      status: form.get("status") as PimEmployee["status"],
      email: String(form.get("email")),
      phone: String(form.get("phone")),
      address: String(form.get("address")),
      emergencyContactName: String(form.get("emergencyContactName")),
      emergencyContactPhone: String(form.get("emergencyContactPhone")),
      emergencyContactRelationship: String(form.get("emergencyContactRelationship"))
    };

    if (editing === "new") {
      setEmployees((prev) => [...prev, { id: crypto.randomUUID(), ...record }]);
      // TODO(supabase): insert into `employees`. If this person also
      // needs system login, that's a separate step in Users (§1.1) —
      // PIM creates the person, Users creates their account.
    } else if (editing) {
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editing.id ? { id: editing.id, ...record } : emp))
      );
    }
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Delete this employee record? This can't be undone.")) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    // TODO(supabase): consider soft-delete (status = 'Inactive') instead
    // of a hard delete — Users, Directory, and Leave history all
    // reference employee_id and would orphan otherwise.
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">PIM</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Personal Information Management — the master employee record.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add employee
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-card border border-surface-border bg-white px-3 py-2">
        <Search size={16} className="text-ink-soft" />
        <input
          placeholder="Search by name or employee ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Job title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-ink-muted">{e.employeeId}</td>
                <td className="px-4 py-3 font-medium text-ink">{e.fullName}</td>
                <td className="px-4 py-3 text-ink-muted">{e.jobTitle}</td>
                <td className="px-4 py-3 text-ink-muted">{e.department}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      e.status === "Active"
                        ? "bg-state-successBg text-state-success"
                        : "bg-surface-subtle text-ink-soft"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(e)}
                      aria-label={`Edit ${e.fullName}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(e.id)}
                      aria-label={`Delete ${e.fullName}`}
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
                  No employees match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-ink">
                {editing === "new" ? "Add employee" : "Edit employee"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="rounded-md p-1 text-ink-soft hover:bg-surface-subtle hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Personal details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Employee ID *">
                    <input name="employeeId" required defaultValue={editingRecord?.employeeId} className={inputCls} />
                  </Field>
                  <Field label="Full name *">
                    <input name="fullName" required defaultValue={editingRecord?.fullName} className={inputCls} />
                  </Field>
                  <Field label="Date of birth">
                    <input name="dateOfBirth" type="date" defaultValue={editingRecord?.dateOfBirth} className={inputCls} />
                  </Field>
                  <Field label="Gender">
                    <select name="gender" defaultValue={editingRecord?.gender ?? ""} className={inputCls}>
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Marital status">
                    <select name="maritalStatus" defaultValue={editingRecord?.maritalStatus ?? ""} className={inputCls}>
                      <option value="">—</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field label="Nationality">
                    <input name="nationality" defaultValue={editingRecord?.nationality} className={inputCls} placeholder="e.g. Seychellois" />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Job details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Job title">
                    <input name="jobTitle" defaultValue={editingRecord?.jobTitle} className={inputCls} />
                  </Field>
                  <Field label="Department">
                    <input name="department" defaultValue={editingRecord?.department} className={inputCls} />
                  </Field>
                  <Field label="Employment status">
                    <input name="employmentStatus" defaultValue={editingRecord?.employmentStatus} className={inputCls} placeholder="e.g. Full-Time Permanent" />
                  </Field>
                  <Field label="Date joined">
                    <input name="dateJoined" type="date" defaultValue={editingRecord?.dateJoined} className={inputCls} />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue={editingRecord?.status ?? "Active"} className={inputCls}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Contact details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email">
                    <input name="email" type="email" defaultValue={editingRecord?.email} className={inputCls} />
                  </Field>
                  <Field label="Phone">
                    <input name="phone" defaultValue={editingRecord?.phone} className={inputCls} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Address">
                      <input name="address" defaultValue={editingRecord?.address} className={inputCls} />
                    </Field>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Emergency contact
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Name">
                    <input name="emergencyContactName" defaultValue={editingRecord?.emergencyContactName} className={inputCls} />
                  </Field>
                  <Field label="Phone">
                    <input name="emergencyContactPhone" defaultValue={editingRecord?.emergencyContactPhone} className={inputCls} />
                  </Field>
                  <Field label="Relationship">
                    <input name="emergencyContactRelationship" defaultValue={editingRecord?.emergencyContactRelationship} className={inputCls} />
                  </Field>
                </div>
              </section>

              <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function PimPage() {
  return (
    <Suspense fallback={null}>
      <PimPageInner />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EmployeeRow {
  id: string;
  employee_code: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: "Male" | "Female" | null;
  marital_status: "Single" | "Married" | "Other" | null;
  nationality: string | null;
  job_title: string | null;
  department_id: string | null;
  employment_status: string | null;
  date_joined: string | null;
  status: "active" | "inactive";
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function PimPageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [jobTitles, setJobTitles] = useState<{ id: string; title: string }[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EmployeeRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const editingRecord = editing !== "new" ? editing : null;

  async function load() {
    setLoading(true);
    const [empRes, deptRes, jobRes] = await Promise.all([
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("job_titles").select("id, title").order("title")
    ]);
    setEmployees((empRes.data as EmployeeRow[]) ?? []);
    setDepartments(deptRes.data ?? []);
    setJobTitles(jobRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (searchParams.get("new") === "1") setEditing("new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "—";

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_code ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const record = {
      employee_code: form.get("employeeId"),
      full_name: form.get("fullName"),
      date_of_birth: form.get("dateOfBirth") || null,
      gender: form.get("gender") || null,
      marital_status: form.get("maritalStatus") || null,
      nationality: form.get("nationality"),
      job_title: form.get("jobTitle"),
      department_id: form.get("departmentId") || null,
      employment_status: form.get("employmentStatus"),
      date_joined: form.get("dateJoined") || null,
      status: form.get("status"),
      email: form.get("email"),
      phone: form.get("phone"),
      address: form.get("address"),
      emergency_contact_name: form.get("emergencyContactName"),
      emergency_contact_phone: form.get("emergencyContactPhone"),
      emergency_contact_relationship: form.get("emergencyContactRelationship")
    };

    if (editing === "new") {
      const { error } = await supabase.from("employees").insert(record);
      if (error) {
        alert(error.message.includes("duplicate") ? `Employee ID "${record.employee_code}" is already in use.` : error.message);
        setSaving(false);
        return;
      }
    } else if (editing) {
      await supabase.from("employees").update(record).eq("id", editing.id);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this employee record? This can't be undone.")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      alert(`Couldn't delete — this person is likely still linked to a user account, leave requests, or other records: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">PIM</h1>
          <p className="mt-1 text-sm text-ink-muted">Personal Information Management — live from Supabase.</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={16} /> Add employee
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-card border border-surface-border bg-white px-3 py-2">
        <Search size={16} className="text-ink-soft" />
        <input placeholder="Search by name or employee ID" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-sm focus:outline-none" />
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading employees…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
              <tr><th className="px-4 py-3">Employee ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-ink-muted">{e.employee_code ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{e.full_name}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.job_title ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{departmentName(e.department_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${e.status === "active" ? "bg-state-successBg text-state-success" : "bg-surface-subtle text-ink-soft"}`}>
                      {e.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(e)} aria-label={`Edit ${e.full_name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Pencil size={16} /></button>
                      <button onClick={() => remove(e.id)} aria-label={`Delete ${e.full_name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No employees match this search.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-ink">{editing === "new" ? "Add employee" : "Edit employee"}</h2>
              <button onClick={() => setEditing(null)} aria-label="Close" className="rounded-md p-1 text-ink-soft hover:bg-surface-subtle hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={save} className="space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Personal details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Employee ID *"><input name="employeeId" required defaultValue={editingRecord?.employee_code ?? ""} className={inputCls} /></Field>
                  <Field label="Full name *"><input name="fullName" required defaultValue={editingRecord?.full_name} className={inputCls} /></Field>
                  <Field label="Date of birth"><input name="dateOfBirth" type="date" defaultValue={editingRecord?.date_of_birth ?? ""} className={inputCls} /></Field>
                  <Field label="Gender">
                    <select name="gender" defaultValue={editingRecord?.gender ?? ""} className={inputCls}><option value="">—</option><option value="Male">Male</option><option value="Female">Female</option></select>
                  </Field>
                  <Field label="Marital status">
                    <select name="maritalStatus" defaultValue={editingRecord?.marital_status ?? ""} className={inputCls}><option value="">—</option><option value="Single">Single</option><option value="Married">Married</option><option value="Other">Other</option></select>
                  </Field>
                  <Field label="Nationality"><input name="nationality" defaultValue={editingRecord?.nationality ?? ""} className={inputCls} placeholder="e.g. Seychellois" /></Field>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Job details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Job title">
                    <select name="jobTitle" defaultValue={editingRecord?.job_title ?? ""} className={inputCls}>
                      <option value="">—</option>
                      {jobTitles.map((j) => <option key={j.id} value={j.title}>{j.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Department">
                    <select name="departmentId" defaultValue={editingRecord?.department_id ?? ""} className={inputCls}>
                      <option value="">—</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Employment status"><input name="employmentStatus" defaultValue={editingRecord?.employment_status ?? ""} className={inputCls} placeholder="e.g. Full-Time Permanent" /></Field>
                  <Field label="Date joined"><input name="dateJoined" type="date" defaultValue={editingRecord?.date_joined ?? ""} className={inputCls} /></Field>
                  <Field label="Status">
                    <select name="status" defaultValue={editingRecord?.status ?? "active"} className={inputCls}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Contact details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email"><input name="email" type="email" defaultValue={editingRecord?.email ?? ""} className={inputCls} /></Field>
                  <Field label="Phone"><input name="phone" defaultValue={editingRecord?.phone ?? ""} className={inputCls} /></Field>
                  <div className="col-span-2"><Field label="Address"><input name="address" defaultValue={editingRecord?.address ?? ""} className={inputCls} /></Field></div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">Emergency contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Name"><input name="emergencyContactName" defaultValue={editingRecord?.emergency_contact_name ?? ""} className={inputCls} /></Field>
                  <Field label="Phone"><input name="emergencyContactPhone" defaultValue={editingRecord?.emergency_contact_phone ?? ""} className={inputCls} /></Field>
                  <Field label="Relationship"><input name="emergencyContactRelationship" defaultValue={editingRecord?.emergency_contact_relationship ?? ""} className={inputCls} /></Field>
                </div>
              </section>

              <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
                <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save
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

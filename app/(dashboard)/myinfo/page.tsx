"use client";

import { useState } from "react";
import {
  User, Phone, ShieldAlert, Users2, Plane, Briefcase, Wallet,
  UserCog, GraduationCap, Award, Plus, Trash2
} from "lucide-react";
import { clsx } from "clsx";
import type { Dependent } from "@/lib/types";

// TODO(supabase): reads the current user's own `employees` row (via
// app_users.employee_id) plus a few tables scoped to that employee_id
// (dependents, work_permits). Self-service: you can edit your own
// contact/emergency/dependents info; Job/Salary/Report-to stay
// read-only here (those change through PIM, by HR/Admin, not self-edit).
const ME = {
  fullName: "You",
  employeeId: "EMP-003",
  jobTitle: "Website Coordinator",
  department: "Operations",
  employmentStatus: "Full-Time Permanent",
  dateJoined: "2023-04-10",
  reportsTo: "Jules Esparon",
  payGrade: "Grade 2",
  email: "you@vertexhrm.app",
  phone: "+248 2 500 010",
  address: "Anse Royale, Mahé",
  emergencyContactName: "A. Family",
  emergencyContactPhone: "+248 2 500 099",
  emergencyContactRelationship: "Sibling",
  nationality: "Seychellois",
  gopNumber: null as string | null,
  qualifications: ["Project Management", "English", "French"],
  certificates: ["Digital Marketing"]
};

const SEED_DEPENDENTS: Dependent[] = [];

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500 disabled:bg-surface-subtle disabled:text-ink-muted";

const TABS = [
  { key: "personal", label: "Personal Details", icon: User },
  { key: "contact", label: "Contact Details", icon: Phone },
  { key: "emergency", label: "Emergency Contacts", icon: ShieldAlert },
  { key: "dependents", label: "Dependents", icon: Users2 },
  { key: "immigration", label: "Immigration", icon: Plane },
  { key: "job", label: "Job", icon: Briefcase },
  { key: "salary", label: "Salary", icon: Wallet },
  { key: "reportto", label: "Report-to", icon: UserCog },
  { key: "qualifications", label: "Qualifications", icon: GraduationCap },
  { key: "certificates", label: "Certificates", icon: Award }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyInfoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [dependents, setDependents] = useState<Dependent[]>(SEED_DEPENDENTS);
  const [addingDependent, setAddingDependent] = useState(false);
  const [saved, setSaved] = useState(false);

  function saveNote() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    // TODO(supabase): update the relevant columns on `employees` for
    // this user's employee_id — editable sections only (Contact,
    // Emergency Contacts, Dependents).
  }

  function addDependent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setDependents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        relationship: String(form.get("relationship")),
        dateOfBirth: String(form.get("dateOfBirth"))
      }
    ]);
    setAddingDependent(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">My Info</h1>
      <p className="mt-1 text-sm text-ink-muted">Your own profile — self-service.</p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-64">
          <div className="rounded-card border border-surface-border bg-white p-5 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-xl font-medium text-white">
              {ME.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <p className="mt-3 font-display text-base font-medium text-ink">{ME.fullName}</p>
          </div>

          <nav className="mt-3 space-y-0.5 rounded-card border border-surface-border bg-white p-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  activeTab === key ? "bg-brand-50 font-medium text-brand-700" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                )}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="max-w-2xl flex-1">
        {activeTab === "personal" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Full name</label>
                <input disabled defaultValue={ME.fullName} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Employee ID</label>
                <input disabled defaultValue={ME.employeeId} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Nationality</label>
                <input disabled defaultValue={ME.nationality} className={inputCls} />
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Personal details are set by HR — contact them for corrections.
            </p>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-4 rounded-card border border-surface-border bg-white p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input defaultValue={ME.email} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Phone</label>
              <input defaultValue={ME.phone} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Address</label>
              <input defaultValue={ME.address} className={inputCls} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveNote} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Save
              </button>
              {saved && <span className="text-sm text-state-success">Saved</span>}
            </div>
          </div>
        )}

        {activeTab === "emergency" && (
          <div className="space-y-4 rounded-card border border-surface-border bg-white p-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Name</label>
                <input defaultValue={ME.emergencyContactName} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Phone</label>
                <input defaultValue={ME.emergencyContactPhone} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Relationship</label>
                <input defaultValue={ME.emergencyContactRelationship} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveNote} className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Save
              </button>
              {saved && <span className="text-sm text-state-success">Saved</span>}
            </div>
          </div>
        )}

        {activeTab === "dependents" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingDependent(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Add dependent
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Relationship</th>
                    <th className="px-4 py-3">Date of birth</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.map((d) => (
                    <tr key={d.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{d.name}</td>
                      <td className="px-4 py-3 text-ink-muted">{d.relationship}</td>
                      <td className="px-4 py-3 text-ink-muted">{d.dateOfBirth}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setDependents((prev) => prev.filter((x) => x.id !== d.id))} className="text-ink-soft hover:text-state-danger">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dependents.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No dependents added.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {addingDependent && (
              <form onSubmit={addDependent} className="mt-4 grid grid-cols-3 gap-3 rounded-card border border-surface-border bg-white p-4">
                <input name="name" placeholder="Name" required className={inputCls} />
                <input name="relationship" placeholder="Relationship" required className={inputCls} />
                <input name="dateOfBirth" type="date" required className={inputCls} />
                <div className="col-span-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setAddingDependent(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
                  <button type="submit" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === "immigration" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            {ME.nationality === "Seychellois" ? (
              <p className="text-sm text-ink-muted">
                No work permit required — Seychellois nationals don&apos;t need a Gainful Occupation Permit.
              </p>
            ) : (
              <p className="text-sm text-ink-muted">GOP Number: {ME.gopNumber ?? "Not on file — contact HR."}</p>
            )}
          </div>
        )}

        {activeTab === "job" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Job title</dt><dd className="font-medium text-ink">{ME.jobTitle}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Department</dt><dd className="font-medium text-ink">{ME.department}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Employment status</dt><dd className="font-medium text-ink">{ME.employmentStatus}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Date joined</dt><dd className="font-medium text-ink">{ME.dateJoined}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-soft">Set by HR via PIM — not self-editable.</p>
          </div>
        )}

        {activeTab === "salary" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <p className="text-sm text-ink-muted">Pay grade: <span className="font-medium text-ink">{ME.payGrade}</span></p>
            <p className="mt-1 text-xs text-ink-soft">
              Exact salary figures are visible to Finance/HR only in this view — payslip access lives in a future Payroll module.
            </p>
          </div>
        )}

        {activeTab === "reportto" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <p className="text-sm text-ink-muted">
              Reports to: <span className="font-medium text-ink">{ME.reportsTo}</span>
            </p>
          </div>
        )}

        {activeTab === "qualifications" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <div className="flex flex-wrap gap-2">
              {ME.qualifications.map((q) => (
                <span key={q} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{q}</span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="rounded-card border border-surface-border bg-white p-6">
            <div className="flex flex-wrap gap-2">
              {ME.certificates.map((c) => (
                <span key={c} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{c}</span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

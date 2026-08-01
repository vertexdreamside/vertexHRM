"use client";

import { useMemo, useState } from "react";
import { Search, Mail, Phone, X } from "lucide-react";
import type { DirectoryEmployee } from "@/lib/types";

// TODO(supabase): query `employees` joined to `departments`, `locations`,
// and `job_titles` — see vertex-core-data-model.md §1/§2. Directory is
// read-only: it never writes, only PIM (not yet built) edits employees.
const SEED_EMPLOYEES: DirectoryEmployee[] = [
  { id: "1", fullName: "Jules Esparon", jobTitle: "HR Manager", department: "HR", location: "Head Office", email: "j.esparon@vertexhrm.app", phone: "+248 2 xxx xxx", photoUrl: null },
  { id: "2", fullName: "Marie Dubel", jobTitle: "Operations Manager", department: "Operations", location: "Head Office", email: "m.dubel@vertexhrm.app", phone: "+248 2 xxx xxx", photoUrl: null },
  { id: "3", fullName: "Selvan Pillay", jobTitle: "IT Officer", department: "IT", location: "Head Office", email: "s.pillay@vertexhrm.app", phone: "+248 2 xxx xxx", photoUrl: null },
  { id: "4", fullName: "Aurelie Confait", jobTitle: "Accountant", department: "Finance", location: "Head Office", email: "a.confait@vertexhrm.app", phone: "+248 2 xxx xxx", photoUrl: null }
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function DirectoryPage() {
  const [nameFilter, setNameFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selected, setSelected] = useState<DirectoryEmployee | null>(null);

  const jobTitles = useMemo(
    () => [...new Set(SEED_EMPLOYEES.map((e) => e.jobTitle))],
    []
  );
  const locations = useMemo(
    () => [...new Set(SEED_EMPLOYEES.map((e) => e.location))],
    []
  );

  const filtered = SEED_EMPLOYEES.filter((e) => {
    if (nameFilter && !e.fullName.toLowerCase().includes(nameFilter.toLowerCase()))
      return false;
    if (jobTitleFilter && e.jobTitle !== jobTitleFilter) return false;
    if (locationFilter && e.location !== locationFilter) return false;
    return true;
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Directory
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Browse everyone in the organization. Read-only — edits happen in
        PIM.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-card border border-surface-border bg-white p-4 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2">
          <Search size={16} className="text-ink-soft" />
          <input
            placeholder="Employee name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select
          value={jobTitleFilter}
          onChange={(e) => setJobTitleFilter(e.target.value)}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        >
          <option value="">All job titles</option>
          {jobTitles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelected(emp)}
            className="flex flex-col items-center gap-2 rounded-card border border-surface-border bg-white p-5 text-center transition-shadow hover:shadow-md"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-lg font-medium text-white">
              {initials(emp.fullName)}
            </div>
            <div>
              <p className="font-medium text-ink">{emp.fullName}</p>
              <p className="text-xs text-ink-muted">{emp.jobTitle}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-soft">
            No one matches these filters.
          </p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-base font-medium text-white">
                  {initials(selected.fullName)}
                </div>
                <div>
                  <p className="font-display font-medium text-ink">
                    {selected.fullName}
                  </p>
                  <p className="text-sm text-ink-muted">{selected.jobTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-md p-1 text-ink-soft hover:bg-surface-subtle hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 border-t border-surface-border pt-4 text-sm">
              <p className="text-ink-muted">
                <span className="font-medium text-ink">Department:</span>{" "}
                {selected.department}
              </p>
              <p className="text-ink-muted">
                <span className="font-medium text-ink">Location:</span>{" "}
                {selected.location}
              </p>
              <a
                href={`mailto:${selected.email}`}
                className="flex items-center gap-2 text-brand-700 hover:underline"
              >
                <Mail size={14} /> {selected.email}
              </a>
              <a
                href={`tel:${selected.phone}`}
                className="flex items-center gap-2 text-brand-700 hover:underline"
              >
                <Phone size={14} /> {selected.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

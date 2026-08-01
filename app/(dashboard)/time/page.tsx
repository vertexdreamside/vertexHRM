"use client";

import { Suspense } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, ListChecks, Send, Check, X as XIcon, MapPin, FolderKanban, FileBarChart, Plus, LogIn, LogOut } from "lucide-react";
import { clsx } from "clsx";
import type { Timesheet, TimesheetProject, TimesheetStatus } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SEED_PROJECTS: TimesheetProject[] = [
  { id: "1", name: "Internal / General" },
  { id: "2", name: "Ozone Unit Website" },
  { id: "3", name: "Client Support" }
];

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const CURRENT_WEEK = mondayOf(new Date());

const SEED_MY_TIMESHEET: Timesheet = {
  id: "1",
  employeeName: "You",
  weekStarting: CURRENT_WEEK,
  status: "Draft",
  entries: {
    "1": { Mon: 2, Tue: 1, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
    "2": { Mon: 6, Tue: 6, Wed: 7, Thu: 7, Fri: 5, Sat: 0, Sun: 0 }
  }
};

const SEED_TEAM_TIMESHEETS: Timesheet[] = [
  {
    id: "2",
    employeeName: "Marie Dubel",
    weekStarting: CURRENT_WEEK,
    status: "Submitted",
    entries: { "1": { Mon: 8, Tue: 8, Wed: 8, Thu: 8, Fri: 8, Sat: 0, Sun: 0 } }
  }
];

const statusStyles: Record<TimesheetStatus, string> = {
  Draft: "bg-surface-subtle text-ink-soft",
  Submitted: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger"
};

function rowTotal(entries: Timesheet["entries"], projectId: string) {
  const row = entries[projectId] ?? {};
  return DAYS.reduce((sum, d) => sum + (row[d] ?? 0), 0);
}

function grandTotal(entries: Timesheet["entries"]) {
  return Object.keys(entries).reduce((sum, pid) => sum + rowTotal(entries, pid), 0);
}

const TABS = [
  { key: "mytimesheet", label: "Timesheets", icon: Clock3 },
  { key: "employeetimesheets", label: "Employee Timesheets", icon: ListChecks },
  { key: "attendance", label: "Attendance", icon: MapPin },
  { key: "projects", label: "Project Info", icon: FolderKanban },
  { key: "reports", label: "Reports", icon: FileBarChart }
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface AttendanceRecord {
  id: string;
  employeeName: string;
  date: string;
  punchIn: string;
  punchOut: string | null;
}

const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: "1", employeeName: "You", date: "2026-08-01", punchIn: "08:02", punchOut: "16:05" },
  { id: "2", employeeName: "Marie Dubel", date: "2026-08-01", punchIn: "07:58", punchOut: null }
];

function TimePageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) || "mytimesheet"
  );
  const [myTimesheet, setMyTimesheet] = useState<Timesheet>(SEED_MY_TIMESHEET);
  const [teamTimesheets, setTeamTimesheets] = useState<Timesheet[]>(SEED_TEAM_TIMESHEETS);
  const [projects, setProjects] = useState<TimesheetProject[]>(SEED_PROJECTS);
  const [attendance] = useState<AttendanceRecord[]>(SEED_ATTENDANCE);
  const [addingProject, setAddingProject] = useState(false);

  function updateHours(projectId: string, day: string, value: number) {
    setMyTimesheet((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [projectId]: { ...prev.entries[projectId], [day]: value }
      }
    }));
  }

  function submitTimesheet() {
    setMyTimesheet((prev) => ({ ...prev, status: "Submitted" }));
    // TODO(supabase): upsert `timesheets` + `timesheet_entries`, set
    // status = 'Submitted'; write an inbox_items row for the approver
    // (Admin Ops §16), same pattern as Leave.
  }

  function decide(id: string, status: "Approved" | "Rejected") {
    setTeamTimesheets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  const myTotal = useMemo(() => grandTotal(myTimesheet.entries), [myTimesheet]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Time</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Weekly timesheets. Daily punch in/out lives on the Dashboard.
      </p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
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
        {activeTab === "mytimesheet" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-ink-muted">
                Week of <span className="font-medium text-ink">{myTimesheet.weekStarting}</span>
              </p>
              <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[myTimesheet.status])}>
                {myTimesheet.status}
              </span>
            </div>

            <div className="overflow-x-auto rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    {DAYS.map((d) => (
                      <th key={d} className="px-2 py-3 text-center">{d}</th>
                    ))}
                    <th className="px-4 py-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                      {DAYS.map((d) => (
                        <td key={d} className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            disabled={myTimesheet.status !== "Draft"}
                            value={myTimesheet.entries[p.id]?.[d] ?? 0}
                            onChange={(e) => updateHours(p.id, d, Number(e.target.value))}
                            className="w-12 rounded-md border border-surface-border px-1 py-1 text-center text-sm disabled:bg-surface-subtle disabled:text-ink-soft"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center text-ink-muted">
                        {rowTotal(myTimesheet.entries, p.id)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-surface-border bg-surface-subtle font-medium text-ink">
                    <td className="px-4 py-3">Total</td>
                    {DAYS.map((d) => (
                      <td key={d} className="px-2 py-3 text-center">
                        {projects.reduce((sum, p) => sum + (myTimesheet.entries[p.id]?.[d] ?? 0), 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">{myTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {myTimesheet.status === "Draft" && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={submitTimesheet}
                  className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Send size={16} /> Submit timesheet
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "employeetimesheets" && (
          <div className="overflow-hidden rounded-card border border-surface-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Week of</th>
                  <th className="px-4 py-3">Total hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamTimesheets.map((t) => (
                  <tr key={t.id} className="border-t border-surface-border">
                    <td className="px-4 py-3 font-medium text-ink">{t.employeeName}</td>
                    <td className="px-4 py-3 text-ink-muted">{t.weekStarting}</td>
                    <td className="px-4 py-3 text-ink-muted">{grandTotal(t.entries)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[t.status])}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "Submitted" ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => decide(t.id, "Approved")}
                            aria-label={`Approve ${t.employeeName}'s timesheet`}
                            className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => decide(t.id, "Rejected")}
                            aria-label={`Reject ${t.employeeName}'s timesheet`}
                            className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {teamTimesheets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">
                      No timesheets submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "attendance" && (
          <div>
            <p className="mb-3 max-w-2xl text-sm text-ink-muted">
              A log of the punch in/out records from the Dashboard&apos;s Time
              at Work widget.
            </p>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Punch in</th>
                    <th className="px-4 py-3">Punch out</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{a.employeeName}</td>
                      <td className="px-4 py-3 text-ink-muted">{a.date}</td>
                      <td className="px-4 py-3 text-ink-muted"><LogIn size={12} className="mr-1 inline text-state-success" />{a.punchIn}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {a.punchOut ? (<><LogOut size={12} className="mr-1 inline text-state-danger" />{a.punchOut}</>) : "Still punched in"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingProject(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Add project
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              {projects.map((p, i) => (
                <div key={p.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>
                  {p.name}
                </div>
              ))}
            </div>
            {addingProject && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  setProjects((prev) => [...prev, { id: crypto.randomUUID(), name: String(form.get("name")) }]);
                  setAddingProject(false);
                }}
                className="mt-4 flex gap-2 rounded-card border border-surface-border bg-white p-4"
              >
                <input name="name" required placeholder="Project name" className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
                <button type="submit" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
              </form>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
            Not built yet — hours by project and timesheet submission
            compliance (who hasn&apos;t submitted this week) are the natural
            first reports here.
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimePage() {
  return (
    <Suspense fallback={null}>
      <TimePageInner />
    </Suspense>
  );
}

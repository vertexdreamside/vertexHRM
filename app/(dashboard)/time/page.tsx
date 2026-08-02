"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, ListChecks, Send, Check, X as XIcon, MapPin, FolderKanban, FileBarChart, Plus, LogIn, LogOut, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const statusStyles: Record<string, string> = {
  Draft: "bg-surface-subtle text-ink-soft",
  Submitted: "bg-state-warningBg text-state-warning",
  Approved: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger"
};

const TABS = [
  { key: "mytimesheet", label: "Timesheets", icon: Clock3 },
  { key: "employeetimesheets", label: "Employee Timesheets", icon: ListChecks },
  { key: "attendance", label: "Attendance", icon: MapPin },
  { key: "projects", label: "Project Info", icon: FolderKanban },
  { key: "reports", label: "Reports", icon: FileBarChart }
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface ProjectRow { id: string; name: string }
interface TimesheetRow { id: string; employee_id: string; week_starting: string; status: string; employees: { full_name: string } | { full_name: string }[] | null }
interface EntryRow { id: string; timesheet_id: string; project_id: string; day_of_week: string; hours: number }

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function LoadingBlock() {
  return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}

function TimePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "mytimesheet");

  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [myTimesheetId, setMyTimesheetId] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [punches, setPunches] = useState<{ id: string; employee_id: string; punch_in: string; punch_out: string | null; employees: { full_name: string } | { full_name: string }[] | null }[]>([]);

  const weekStarting = mondayOf(new Date());

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let employeeId: string | null = null;
    if (user) {
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      employeeId = appUser?.employee_id ?? null;
    }
    setMyEmployeeId(employeeId);

    const [projectsRes, timesheetsRes, punchesRes] = await Promise.all([
      supabase.from("timesheet_projects").select("id, name").order("name"),
      supabase.from("timesheets").select("id, employee_id, week_starting, status, employees(full_name)").order("week_starting", { ascending: false }),
      supabase.from("time_punches").select("id, employee_id, punch_in, punch_out, employees(full_name)").order("punch_in", { ascending: false }).limit(50)
    ]);
    setProjects((projectsRes.data as ProjectRow[]) ?? []);
    setTimesheets((timesheetsRes.data as TimesheetRow[]) ?? []);
    setPunches(punchesRes.data ?? []);

    let mine = (timesheetsRes.data as TimesheetRow[] | null)?.find((t) => t.employee_id === employeeId && t.week_starting === weekStarting) ?? null;

    if (!mine && employeeId) {
      const { data: created } = await supabase.from("timesheets").insert({ employee_id: employeeId, week_starting: weekStarting, status: "Draft" }).select("id, employee_id, week_starting, status").single();
      if (created) mine = { ...created, employees: null };
    }
    setMyTimesheetId(mine?.id ?? null);

    if (mine) {
      const { data: entryData } = await supabase.from("timesheet_entries").select("id, timesheet_id, project_id, day_of_week, hours").eq("timesheet_id", mine.id);
      setEntries((entryData as EntryRow[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myTimesheet = timesheets.find((t) => t.id === myTimesheetId) ?? (myTimesheetId ? { id: myTimesheetId, employee_id: myEmployeeId!, week_starting: weekStarting, status: "Draft", employees: null } : null);

  function hoursFor(projectId: string, day: string) {
    return entries.find((e) => e.project_id === projectId && e.day_of_week === day)?.hours ?? 0;
  }

  async function updateHours(projectId: string, day: string, value: number) {
    if (!myTimesheetId) return;
    const existing = entries.find((e) => e.project_id === projectId && e.day_of_week === day && e.timesheet_id === myTimesheetId);
    if (existing) {
      setEntries((prev) => prev.map((e) => (e.id === existing.id ? { ...e, hours: value } : e)));
      await supabase.from("timesheet_entries").update({ hours: value }).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("timesheet_entries").insert({ timesheet_id: myTimesheetId, project_id: projectId, day_of_week: day, hours: value }).select("id").single();
      if (data) setEntries((prev) => [...prev, { id: data.id, timesheet_id: myTimesheetId, project_id: projectId, day_of_week: day, hours: value }]);
    }
  }

  async function submitTimesheet() {
    if (!myTimesheetId) return;
    await supabase.from("timesheets").update({ status: "Submitted", submitted_at: new Date().toISOString() }).eq("id", myTimesheetId);
    load();
  }

  async function decide(id: string, status: "Approved" | "Rejected") {
    await supabase.from("timesheets").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  const myEntries = useMemo(() => entries.filter((e) => e.timesheet_id === myTimesheetId), [entries, myTimesheetId]);
  const rowTotal = (projectId: string) => DAYS.reduce((sum, d) => sum + hoursFor(projectId, d), 0);
  const grandTotal = useMemo(() => myEntries.reduce((sum, e) => sum + e.hours, 0), [myEntries]);
  const teamTimesheets = timesheets.filter((t) => t.employee_id !== myEmployeeId);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Time</h1>
      <p className="mt-1 text-sm text-ink-muted">Weekly timesheets — live from Supabase. Daily punch in/out lives on the Dashboard.</p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? <div className="mt-6"><LoadingBlock /></div> : (
        <div className="mt-6">
          {activeTab === "mytimesheet" && (
            <div>
              {!myEmployeeId && (
                <div className="mb-4 rounded-card border border-state-warning/30 bg-state-warningBg p-4 text-sm text-state-warning">
                  Your login isn&apos;t linked to an employee record — ask an admin to link it in Users before logging time.
                </div>
              )}
              {myTimesheet && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-ink-muted">Week of <span className="font-medium text-ink">{myTimesheet.week_starting}</span></p>
                    <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[myTimesheet.status])}>{myTimesheet.status}</span>
                  </div>
                  <div className="overflow-x-auto rounded-card border border-surface-border bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                        <tr><th className="px-4 py-3">Project</th>{DAYS.map((d) => <th key={d} className="px-2 py-3 text-center">{d}</th>)}<th className="px-4 py-3 text-center">Total</th></tr>
                      </thead>
                      <tbody>
                        {projects.map((p) => (
                          <tr key={p.id} className="border-t border-surface-border">
                            <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                            {DAYS.map((d) => (
                              <td key={d} className="px-1 py-2 text-center">
                                <input type="number" min={0} max={24} step={0.5} disabled={myTimesheet.status !== "Draft"} value={hoursFor(p.id, d)} onChange={(e) => updateHours(p.id, d, Number(e.target.value))} className="w-12 rounded-md border border-surface-border px-1 py-1 text-center text-sm disabled:bg-surface-subtle disabled:text-ink-soft" />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center text-ink-muted">{rowTotal(p.id)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-surface-border bg-surface-subtle font-medium text-ink">
                          <td className="px-4 py-3">Total</td>
                          {DAYS.map((d) => <td key={d} className="px-2 py-3 text-center">{projects.reduce((sum, p) => sum + hoursFor(p.id, d), 0)}</td>)}
                          <td className="px-4 py-3 text-center">{grandTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {myTimesheet.status === "Draft" && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={submitTimesheet} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Send size={16} /> Submit timesheet</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "employeetimesheets" && (
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Week of</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody>
                  {teamTimesheets.map((t) => (
                    <tr key={t.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{one(t.employees)?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-muted">{t.week_starting}</td>
                      <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyles[t.status])}>{t.status}</span></td>
                      <td className="px-4 py-3">
                        {t.status === "Submitted" ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => decide(t.id, "Approved")} aria-label="Approve" className="rounded-md p-1.5 text-state-success hover:bg-state-successBg"><Check size={16} /></button>
                            <button onClick={() => decide(t.id, "Rejected")} aria-label="Reject" className="rounded-md p-1.5 text-state-danger hover:bg-state-dangerBg"><XIcon size={16} /></button>
                          </div>
                        ) : <span className="block text-right text-xs text-ink-soft">—</span>}
                      </td>
                    </tr>
                  ))}
                  {teamTimesheets.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No timesheets submitted yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "attendance" && (
            <div>
              <p className="mb-3 max-w-2xl text-sm text-ink-muted">A log of punch in/out records from the Dashboard&apos;s Time at Work widget.</p>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Punch in</th><th className="px-4 py-3">Punch out</th></tr></thead>
                  <tbody>
                    {punches.map((p) => (
                      <tr key={p.id} className="border-t border-surface-border">
                        <td className="px-4 py-3 font-medium text-ink">{one(p.employees)?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-ink-muted"><LogIn size={12} className="mr-1 inline text-state-success" />{new Date(p.punch_in).toLocaleString()}</td>
                        <td className="px-4 py-3 text-ink-muted">{p.punch_out ? <><LogOut size={12} className="mr-1 inline text-state-danger" />{new Date(p.punch_out).toLocaleString()}</> : "Still punched in"}</td>
                      </tr>
                    ))}
                    {punches.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">No punches recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "projects" && (
            <div>
              <div className="mb-3 flex justify-end">
                <button onClick={() => setAddingProject(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add project</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                {projects.map((p, i) => <div key={p.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{p.name}</div>)}
              </div>
              {addingProject && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    await supabase.from("timesheet_projects").insert({ name: form.get("name") });
                    setAddingProject(false);
                    load();
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
              Not built yet — hours by project and timesheet submission compliance are the natural first reports here.
            </div>
          )}
        </div>
      )}
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

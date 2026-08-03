"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, Send, Check, X as XIcon, Plus, LogIn, LogOut, ChevronDown, Loader2 } from "lucide-react";
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

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function LoadingBlock() {
  return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}

// ---------------------------------------------------------------------
// Nav — Timesheets, Attendance, Reports, and Project Info each expand
// into their own sub-items, matching the reference exactly.
// ---------------------------------------------------------------------
type ViewKey =
  | "timesheets-my" | "timesheets-employee"
  | "attendance-my" | "attendance-punch" | "attendance-employee" | "attendance-config"
  | "reports-project" | "reports-employee" | "reports-attendance"
  | "projectinfo-customers" | "projectinfo-projects";

const NAV_ITEMS: { label: string; dropdown: { label: string; view: ViewKey }[] }[] = [
  { label: "Timesheets", dropdown: [{ label: "My Timesheets", view: "timesheets-my" }, { label: "Employee Timesheets", view: "timesheets-employee" }] },
  { label: "Attendance", dropdown: [
    { label: "My Records", view: "attendance-my" },
    { label: "Punch In/Out", view: "attendance-punch" },
    { label: "Employee Records", view: "attendance-employee" },
    { label: "Configuration", view: "attendance-config" }
  ] },
  { label: "Reports", dropdown: [
    { label: "Project Reports", view: "reports-project" },
    { label: "Employee Reports", view: "reports-employee" },
    { label: "Attendance Summary", view: "reports-attendance" }
  ] },
  { label: "Project Info", dropdown: [{ label: "Customers", view: "projectinfo-customers" }, { label: "Projects", view: "projectinfo-projects" }] }
];

function TimeNav({ active, onChange }: { active: ViewKey; onChange: (v: ViewKey) => void }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenLabel(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="mb-6 flex flex-wrap gap-1.5 border-b border-surface-border pb-4">
      {NAV_ITEMS.map((item) => {
        const isActiveGroup = item.dropdown.some((d) => d.view === active);
        return (
          <div key={item.label} className="relative">
            <button onClick={() => setOpenLabel((v) => (v === item.label ? null : item.label))} className={clsx("flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", isActiveGroup ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700")}>
              {item.label} <ChevronDown size={14} className={clsx("transition-transform", openLabel === item.label && "rotate-180")} />
            </button>
            {openLabel === item.label && (
              <div className="absolute left-0 z-20 mt-1.5 w-52 rounded-card border border-surface-border bg-white py-1.5 shadow-lg">
                {item.dropdown.map((d) => (
                  <button key={d.view} onClick={() => { onChange(d.view); setOpenLabel(null); }} className={clsx("block w-full px-4 py-2 text-left text-sm hover:bg-surface-subtle", active === d.view ? "font-medium text-brand-700" : "text-ink-muted")}>
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NotBuilt({ note }: { note: string }) {
  return <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">Not built yet — {note}</div>;
}

interface ProjectRow { id: string; name: string }
interface CustomerRow { id: string; name: string }
interface TimesheetRow { id: string; employee_id: string; week_starting: string; status: string; employees: { full_name: string } | { full_name: string }[] | null }
interface EntryRow { id: string; timesheet_id: string; project_id: string; day_of_week: string; hours: number }
interface PunchRow { id: string; employee_id: string; punch_in: string; punch_out: string | null; employees: { full_name: string } | { full_name: string }[] | null }

function TimePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewKey>((searchParams.get("tab") as ViewKey) || "timesheets-my");

  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [myTimesheetId, setMyTimesheetId] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [punches, setPunches] = useState<PunchRow[]>([]);

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

    const [projectsRes, customersRes, timesheetsRes, punchesRes] = await Promise.all([
      supabase.from("timesheet_projects").select("id, name").order("name"),
      supabase.from("timesheet_customers").select("id, name").order("name"),
      supabase.from("timesheets").select("id, employee_id, week_starting, status, employees(full_name)").order("week_starting", { ascending: false }),
      supabase.from("time_punches").select("id, employee_id, punch_in, punch_out, employees(full_name)").order("punch_in", { ascending: false }).limit(50)
    ]);
    setProjects((projectsRes.data as ProjectRow[]) ?? []);
    setCustomers((customersRes.data as CustomerRow[]) ?? []);
    setTimesheets((timesheetsRes.data as TimesheetRow[]) ?? []);
    setPunches((punchesRes.data as unknown as PunchRow[]) ?? []);

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
  const myPunches = punches.filter((p) => p.employee_id === myEmployeeId);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Time</h1>
      <p className="mt-1 text-sm text-ink-muted">Weekly timesheets and attendance — live from Supabase.</p>

      <TimeNav active={view} onChange={setView} />

      {loading ? <LoadingBlock /> : (
        <div>
          {view === "timesheets-my" && (
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
                      <button onClick={submitTimesheet} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Send size={16} /> Submit timesheet</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {view === "timesheets-employee" && (
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
                  {teamTimesheets.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {view === "attendance-my" && (
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Punch in</th><th className="px-4 py-3">Punch out</th></tr></thead>
                <tbody>
                  {myPunches.map((p) => (
                    <tr key={p.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 text-ink-muted"><LogIn size={12} className="mr-1 inline text-state-success" />{new Date(p.punch_in).toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.punch_out ? <><LogOut size={12} className="mr-1 inline text-state-danger" />{new Date(p.punch_out).toLocaleString()}</> : "Still punched in"}</td>
                    </tr>
                  ))}
                  {myPunches.length === 0 && <tr><td colSpan={2} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {view === "attendance-punch" && (
            <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6 text-center">
              <Clock3 size={28} className="mx-auto mb-2 text-brand-700" />
              <p className="text-sm text-ink-muted">Punching in/out lives on the Dashboard&apos;s Time at Work widget, where the live timer is.</p>
            </div>
          )}

          {view === "attendance-employee" && (
            <div>
              <p className="mb-3 max-w-2xl text-sm text-ink-muted">A log of everyone&apos;s punch in/out records.</p>
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
                    {punches.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "attendance-config" && <NotBuilt note="attendance rules (grace periods, rounding, overtime thresholds) aren't defined yet." />}
          {view === "reports-project" && <NotBuilt note="hours by project is the natural first report here." />}
          {view === "reports-employee" && <NotBuilt note="hours by employee across a date range." />}
          {view === "reports-attendance" && <NotBuilt note="punctuality/attendance summary across the organization." />}

          {view === "projectinfo-customers" && (
            <div>
              <div className="mb-3 flex justify-end">
                <button onClick={() => setAddingCustomer(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add customer</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                {customers.map((c, i) => <div key={c.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{c.name}</div>)}
                {customers.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</p>}
              </div>
              {addingCustomer && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    await supabase.from("timesheet_customers").insert({ name: form.get("name") });
                    setAddingCustomer(false);
                    load();
                  }}
                  className="mt-4 flex gap-2 rounded-card border border-surface-border bg-white p-4"
                >
                  <input name="name" required placeholder="Customer name" className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
                  <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
                </form>
              )}
            </div>
          )}

          {view === "projectinfo-projects" && (
            <div>
              <div className="mb-3 flex justify-end">
                <button onClick={() => setAddingProject(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add project</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                {projects.map((p, i) => <div key={p.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{p.name}</div>)}
                {projects.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</p>}
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
                  <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
                </form>
              )}
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

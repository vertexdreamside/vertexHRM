"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Target, ClipboardList, TrendingUp, Users2, Wallet, FileSignature, Flag, MessageSquare, CheckCircle2,
  Plus, Search, ChevronDown, Loader2, Pencil, Trash2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function Loading() {
  return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

// ---------------------------------------------------------------------
// Top nav — Configure and Manage Reviews expand into their own
// sub-items (matches the reference exactly); My Trackers/Employee
// Trackers stay flat. 13th Month Salary and Appraisal are kept as
// flat extras beyond the reference, from earlier in this build.
// ---------------------------------------------------------------------
type ViewKey =
  | "goals" | "checkins"
  | "configure-kpis" | "configure-trackers"
  | "reviews-manage" | "reviews-my" | "reviews-employee"
  | "mytrackers" | "employeetrackers" | "thirteenthmonth" | "appraisal";

const NAV_ITEMS: { label: string; icon: typeof Target; view?: ViewKey; dropdown?: { label: string; view: ViewKey }[] }[] = [
  { label: "Goals & OKRs", icon: Flag, view: "goals" },
  { label: "Quarterly Check-Ins", icon: MessageSquare, view: "checkins" },
  { label: "Configure", icon: Target, dropdown: [{ label: "KPIs", view: "configure-kpis" }, { label: "Trackers", view: "configure-trackers" }] },
  { label: "Manage Reviews", icon: ClipboardList, dropdown: [
    { label: "Manage Reviews", view: "reviews-manage" },
    { label: "My Reviews", view: "reviews-my" },
    { label: "Employee Reviews", view: "reviews-employee" }
  ] },
  { label: "My Trackers", icon: TrendingUp, view: "mytrackers" },
  { label: "Employee Trackers", icon: Users2, view: "employeetrackers" },
  { label: "13th Month Salary", icon: Wallet, view: "thirteenthmonth" },
  { label: "Appraisal", icon: FileSignature, view: "appraisal" }
];

function PerformanceNav({ active, onChange }: { active: ViewKey; onChange: (v: ViewKey) => void }) {
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
        const isActiveGroup = item.dropdown ? item.dropdown.some((d) => d.view === active) : item.view === active;
        if (!item.dropdown) {
          return (
            <button key={item.label} onClick={() => onChange(item.view!)} className={clsx("flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", isActiveGroup ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700")}>
              {item.label}
            </button>
          );
        }
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

interface EmployeeOption { id: string; full_name: string; job_title: string | null; department_id: string | null }
interface JobTitleOption { id: string; title: string }
interface DepartmentOption { id: string; name: string }

function PerformancePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewKey>((searchParams.get("tab") as ViewKey) || "reviews-manage");

  const [loading, setLoading] = useState(true);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
        setMyEmployeeId(appUser?.employee_id ?? null);
      }
      const [empRes, jobRes, deptRes] = await Promise.all([
        supabase.from("employees").select("id, full_name, job_title, department_id").order("full_name"),
        supabase.from("job_titles").select("id, title").order("title"),
        supabase.from("departments").select("id, name").order("name")
      ]);
      setEmployees(empRes.data ?? []);
      setJobTitles((jobRes.data as JobTitleOption[]) ?? []);
      setDepartments((deptRes.data as DepartmentOption[]) ?? []);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Performance</h1>
      <p className="mt-1 text-sm text-ink-muted">Reviews, KPIs, and goal tracking — live from Supabase.</p>

      <PerformanceNav active={view} onChange={setView} />

      {loading ? <Loading /> : (
        <>
          {view === "goals" && <GoalsTab employees={employees} myEmployeeId={myEmployeeId} departments={departments} />}
          {view === "checkins" && <CheckInsTab employees={employees} myEmployeeId={myEmployeeId} />}
          {view === "configure-kpis" && <KpisTab jobTitles={jobTitles} />}
          {view === "configure-trackers" && <TrackerTemplatesTab />}
          {view === "reviews-manage" && <ReviewsSection key="manage" mode="manage" employees={employees} jobTitles={jobTitles} departments={departments} myEmployeeId={myEmployeeId} />}
          {view === "reviews-my" && <ReviewsSection key="my" mode="my" employees={employees} jobTitles={jobTitles} departments={departments} myEmployeeId={myEmployeeId} />}
          {view === "reviews-employee" && <ReviewsSection key="employee" mode="employee" employees={employees} jobTitles={jobTitles} departments={departments} myEmployeeId={myEmployeeId} />}
          {(view === "mytrackers" || view === "employeetrackers") && (
            <TrackersTab mode={view === "mytrackers" ? "mine" : "employees"} employees={employees} myEmployeeId={myEmployeeId} />
          )}
          {view === "thirteenthmonth" && <ThirteenthMonthTab />}
          {view === "appraisal" && <AppraisalTab />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Goals & OKRs
// ---------------------------------------------------------------------
const GOAL_TYPES = ["Individual Goal", "Department Goal", "Company Goal", "Development Goal", "Project Goal", "KPI Goal", "Operational Goal"];
const GOAL_STATUSES = ["Draft", "Pending Approval", "Active", "In Progress", "At Risk", "On Hold", "Achieved", "Partially Achieved", "Not Achieved", "Cancelled"];
const goalStatusStyles: Record<string, string> = {
  Draft: "bg-surface-subtle text-ink-soft", "Pending Approval": "bg-state-warningBg text-state-warning",
  Active: "bg-brand-50 text-brand-700", "In Progress": "bg-brand-50 text-brand-700",
  "At Risk": "bg-state-dangerBg text-state-danger", "On Hold": "bg-surface-subtle text-ink-soft",
  Achieved: "bg-state-successBg text-state-success", "Partially Achieved": "bg-state-warningBg text-state-warning",
  "Not Achieved": "bg-state-dangerBg text-state-danger", Cancelled: "bg-surface-subtle text-ink-soft"
};

interface GoalRow {
  id: string; employee_id: string; title: string; description: string | null; goal_type: string; status: string;
  due_date: string | null; weight: number; target_value: number | null; current_value: number | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function goalProgress(g: GoalRow): number | null {
  if (g.target_value === null || g.target_value === 0) return null;
  return Math.round(((g.current_value ?? 0) / g.target_value) * 100);
}

function GoalsTab({
  employees, myEmployeeId, departments
}: {
  employees: EmployeeOption[]; myEmployeeId: string | null; departments: DepartmentOption[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProgress, setEditingProgress] = useState<GoalRow | null>(null);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase
      .from("performance_goals")
      .select("id, employee_id, title, description, goal_type, status, due_date, weight, target_value, current_value, employees(full_name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    setGoals((data as unknown as GoalRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("performance_goals").insert({
      employee_id: tab === "mine" ? myEmployeeId : form.get("employeeId"),
      title: form.get("title"),
      description: form.get("description"),
      goal_type: form.get("goalType"),
      department_id: form.get("departmentId") || null,
      due_date: form.get("dueDate") || null,
      priority: form.get("priority"),
      weight: Number(form.get("weight") || 0),
      measurement_method: form.get("measurementMethod"),
      target_value: form.get("targetValue") ? Number(form.get("targetValue")) : null,
      status: "Active"
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
    await supabase.from("performance_goals").update({ status }).eq("id", id);
  }

  async function updateProgress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProgress) return;
    const form = new FormData(e.currentTarget);
    const current_value = Number(form.get("currentValue"));
    await supabase.from("performance_goals").update({ current_value }).eq("id", editingProgress.id);
    setEditingProgress(null);
    load();
  }

  const rows = tab === "mine" ? goals.filter((g) => g.employee_id === myEmployeeId) : goals.filter((g) => g.employee_id !== myEmployeeId);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-surface-border">
        <button onClick={() => setTab("mine")} className={clsx("border-b-2 px-4 py-2 text-sm font-medium", tab === "mine" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted")}>My Goals</button>
        <button onClick={() => setTab("team")} className={clsx("border-b-2 px-4 py-2 text-sm font-medium", tab === "team" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted")}>Team Goals</button>
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add goal</button>
      </div>

      <div className="space-y-3">
        {loadingRows ? <Loading /> : rows.map((g) => {
          const progress = goalProgress(g);
          return (
            <div key={g.id} className="rounded-card border border-surface-border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{g.title}</p>
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-ink-soft">{g.goal_type}</span>
                  </div>
                  {tab === "team" && <p className="text-xs text-ink-soft">{one(g.employees)?.full_name}</p>}
                  {g.description && <p className="mt-1 text-sm text-ink-muted">{g.description}</p>}
                  <p className="mt-1 text-xs text-ink-soft">{g.due_date ? `Due ${g.due_date}` : "No due date"} · Weight {g.weight}%</p>
                </div>
                <select value={g.status} onChange={(e) => updateStatus(g.id, e.target.value)} className={clsx("shrink-0 rounded-full border-0 px-2.5 py-0.5 text-xs font-medium", goalStatusStyles[g.status])}>
                  {GOAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {progress !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span>{g.current_value} / {g.target_value}</span>
                    <button onClick={() => setEditingProgress(g)} className="font-medium text-brand-700 hover:underline">{progress}% — update</button>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-subtle">
                    <div className="h-full bg-brand-gradient" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loadingRows && rows.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No goals here yet.</p>}
      </div>

      {adding && (
        <Modal title="Add goal" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            {tab === "team" && (
              <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            )}
            <div><label className="mb-1 block text-sm font-medium text-ink">Title *</label><input name="title" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description</label><textarea name="description" rows={2} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Goal Type *</label><select name="goalType" required className={inputCls}>{GOAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Priority</label><select name="priority" defaultValue="Medium" className={inputCls}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Department</label><select name="departmentId" className={inputCls}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Due Date</label><input name="dueDate" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Weight (%)</label><input name="weight" type="number" min={0} max={100} defaultValue={0} className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Target Value</label><input name="targetValue" type="number" className={inputCls} /></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Measurement Method</label><input name="measurementMethod" placeholder="e.g. tickets resolved, % complete" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}

      {editingProgress && (
        <Modal title="Update progress" onClose={() => setEditingProgress(null)}>
          <form onSubmit={updateProgress} className="space-y-4">
            <p className="text-sm text-ink-muted">{editingProgress.title} — target {editingProgress.target_value}</p>
            <div><label className="mb-1 block text-sm font-medium text-ink">Current value *</label><input name="currentValue" type="number" required defaultValue={editingProgress.current_value ?? 0} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingProgress(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Quarterly Check-Ins — deliberately lightweight, per the reviewed
// proposal: a short structured conversation, not a mini-appraisal.
// ---------------------------------------------------------------------
interface CheckinRow {
  id: string; employee_id: string; quarter: string; outcome: string | null;
  employee_reflection: string | null; manager_summary: string | null;
  employee_ack_at: string | null; manager_ack_at: string | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function currentQuarterLabel() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}

function checkinStatus(c: CheckinRow): string {
  if (c.employee_ack_at && c.manager_ack_at) return "Completed";
  if (!c.employee_ack_at) return "Pending Employee";
  return "Pending Manager";
}

const checkinStatusStyles: Record<string, string> = {
  Completed: "bg-state-successBg text-state-success", "Pending Employee": "bg-state-warningBg text-state-warning",
  "Pending Manager": "bg-brand-50 text-brand-700"
};

function CheckInsTab({ employees, myEmployeeId }: { employees: EmployeeOption[]; myEmployeeId: string | null }) {
  const supabase = createClient();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [starting, setStarting] = useState(false);
  const [editing, setEditing] = useState<CheckinRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase
      .from("quarterly_checkins")
      .select("id, employee_id, quarter, outcome, employee_reflection, manager_summary, employee_ack_at, manager_ack_at, employees(full_name)")
      .order("quarter", { ascending: false });
    setCheckins((data as unknown as CheckinRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const employeeId = tab === "mine" ? myEmployeeId : form.get("employeeId");
    const { error } = await supabase.from("quarterly_checkins").insert({ employee_id: employeeId, quarter: form.get("quarter") });
    setSaving(false);
    if (error) {
      alert(error.message.includes("duplicate") ? "A check-in for that quarter already exists for this employee." : error.message);
      return;
    }
    setStarting(false);
    load();
  }

  async function submitEmployeeReflection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    await supabase.from("quarterly_checkins").update({
      employee_reflection: form.get("reflection"),
      employee_ack_at: new Date().toISOString()
    }).eq("id", editing.id);
    setEditing(null);
    load();
  }

  async function submitManagerSection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    await supabase.from("quarterly_checkins").update({
      manager_summary: form.get("summary"),
      achievements: form.get("achievements"),
      areas_for_attention: form.get("areas"),
      support_required: form.get("support"),
      priorities_next_quarter: form.get("priorities"),
      outcome: form.get("outcome"),
      manager_ack_at: new Date().toISOString()
    }).eq("id", editing.id);
    setEditing(null);
    load();
  }

  const rows = tab === "mine" ? checkins.filter((c) => c.employee_id === myEmployeeId) : checkins.filter((c) => c.employee_id !== myEmployeeId);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-surface-border">
        <button onClick={() => setTab("mine")} className={clsx("border-b-2 px-4 py-2 text-sm font-medium", tab === "mine" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted")}>My Check-Ins</button>
        <button onClick={() => setTab("team")} className={clsx("border-b-2 px-4 py-2 text-sm font-medium", tab === "team" ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted")}>Team Check-Ins</button>
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={() => setStarting(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Start check-in</button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr>{tab === "team" && <th className="px-4 py-3">Employee</th>}<th className="px-4 py-3">Quarter</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loadingRows ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : rows.map((c) => (
              <tr key={c.id} className="border-t border-surface-border">
                {tab === "team" && <td className="px-4 py-3 font-medium text-ink">{one(c.employees)?.full_name}</td>}
                <td className="px-4 py-3 text-ink-muted">{c.quarter}</td>
                <td className="px-4 py-3 text-ink-muted">{c.outcome ?? "—"}</td>
                <td className="px-4 py-3"><span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", checkinStatusStyles[checkinStatus(c)])}>{checkinStatus(c) === "Completed" && <CheckCircle2 size={12} />}{checkinStatus(c)}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => setEditing(c)} className="text-xs font-medium text-brand-700 hover:underline">Open</button></td>
              </tr>
            ))}
            {!loadingRows && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No check-ins yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {starting && (
        <Modal title="Start check-in" onClose={() => setStarting(false)}>
          <form onSubmit={start} className="space-y-4">
            {tab === "team" && (
              <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            )}
            <div><label className="mb-1 block text-sm font-medium text-ink">Quarter *</label><input name="quarter" required defaultValue={currentQuarterLabel()} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStarting(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Start</button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={`Check-In — ${editing.quarter}`} onClose={() => setEditing(null)}>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink">Employee self-reflection</h3>
              {editing.employee_ack_at ? (
                <p className="rounded-md bg-surface-subtle p-3 text-sm text-ink-muted">{editing.employee_reflection || "(no comments left)"}</p>
              ) : (
                <form onSubmit={submitEmployeeReflection} className="space-y-2">
                  <textarea name="reflection" rows={4} placeholder="Key achievements, goals on track/behind, challenges, support needed, priorities for next quarter..." className={inputCls} />
                  <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Submit reflection</button>
                </form>
              )}
            </div>

            <div className="border-t border-surface-border pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Manager section</h3>
              {editing.manager_ack_at ? (
                <div className="space-y-1 text-sm text-ink-muted">
                  <p><span className="font-medium text-ink">Outcome:</span> {editing.outcome}</p>
                  <p><span className="font-medium text-ink">Summary:</span> {editing.manager_summary}</p>
                </div>
              ) : !editing.employee_ack_at ? (
                <p className="text-sm text-ink-soft">Waiting on the employee&apos;s self-reflection first.</p>
              ) : (
                <form onSubmit={submitManagerSection} className="space-y-3">
                  <textarea name="summary" rows={2} placeholder="Performance summary" className={inputCls} />
                  <textarea name="achievements" rows={2} placeholder="Achievements" className={inputCls} />
                  <textarea name="areas" rows={2} placeholder="Areas requiring attention" className={inputCls} />
                  <textarea name="support" rows={2} placeholder="Support required" className={inputCls} />
                  <textarea name="priorities" rows={2} placeholder="Priorities for next quarter" className={inputCls} />
                  <select name="outcome" required className={inputCls}>
                    <option value="">Outcome *</option>
                    <option value="Exceeding Expectations">Exceeding Expectations</option>
                    <option value="On Track">On Track</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="At Risk">At Risk</option>
                  </select>
                  <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Complete check-in</button>
                </form>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


interface KpiRow { id: string; job_title: string; kpi_name: string; min_rate: number; max_rate: number; is_default: boolean }

function KpisTab({ jobTitles }: { jobTitles: JobTitleOption[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRows, setLoadingRows] = useState(true);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase.from("performance_kpis").select("id, job_title, kpi_name, min_rate, max_rate, is_default").order("job_title");
    setRows((data as KpiRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = jobTitleFilter ? rows.filter((r) => r.job_title === jobTitleFilter) : rows;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("performance_kpis").insert({
      job_title: form.get("jobTitle"),
      kpi_name: form.get("kpiName"),
      min_rate: Number(form.get("minRate")),
      max_rate: Number(form.get("maxRate")),
      is_default: form.get("isDefault") === "on"
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this KPI?")) return;
    await supabase.from("performance_kpis").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-white p-4">
        <h2 className="mb-3 font-display text-base font-medium text-ink">Performance Indicators for Job Title</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="mb-1 block text-sm font-medium text-ink">Job Title</label>
            <select value={jobTitleFilter} onChange={(e) => setJobTitleFilter(e.target.value)} className={inputCls}>
              <option value="">-- Select --</option>
              {jobTitles.map((j) => <option key={j.id} value={j.title}>{j.title}</option>)}
            </select>
          </div>
          <button onClick={() => setJobTitleFilter("")} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add</button>
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Key Performance Indicator</th><th className="px-4 py-3">Job Title</th><th className="px-4 py-3">Min Rate</th><th className="px-4 py-3">Max Rate</th><th className="px-4 py-3">Is Default</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loadingRows ? <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : filtered.map((r) => (
              <tr key={r.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{r.kpi_name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.job_title}</td>
                <td className="px-4 py-3 text-ink-muted">{r.min_rate}</td>
                <td className="px-4 py-3 text-ink-muted">{r.max_rate}</td>
                <td className="px-4 py-3 text-ink-muted">{r.is_default ? "Yes" : "No"}</td>
                <td className="px-4 py-3"><div className="flex justify-end"><button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button></div></td>
              </tr>
            ))}
            {!loadingRows && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add KPI" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Key Performance Indicator *</label><input name="kpiName" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Job Title *</label><select name="jobTitle" required className={inputCls}>{jobTitles.map((j) => <option key={j.id} value={j.title}>{j.title}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Min Rate *</label><input name="minRate" type="number" defaultValue={0} required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Max Rate *</label><input name="maxRate" type="number" defaultValue={100} required className={inputCls} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isDefault" /> Is Default</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Configure → Trackers (goal templates — not detailed in the reference,
// built as a simple reusable catalog so the menu item isn't a dead end)
// ---------------------------------------------------------------------
interface TemplateRow { id: string; name: string }

function TrackerTemplatesTab() {
  const supabase = createClient();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [loadingRows, setLoadingRows] = useState(true);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase.from("performance_tracker_templates").select("id, name").order("name");
    setRows((data as TemplateRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("performance_tracker_templates").insert({ name: form.get("name") });
    setAdding(false);
    load();
  }

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">Reusable goal templates to pick from when adding a tracker.</p>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loadingRows ? <div className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></div> : rows.map((r, i) => (
          <div key={r.id} className={clsx("px-4 py-3 text-sm text-ink", i > 0 && "border-t border-surface-border")}>{r.name}</div>
        ))}
        {!loadingRows && rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</p>}
      </div>

      {adding && (
        <Modal title="Add tracker template" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Manage Reviews / My Reviews / Employee Reviews — one shared component,
// column/filter set adjusted per mode to match each reference screen.
// ---------------------------------------------------------------------
interface ReviewRow {
  id: string; employee_id: string; review_period: string; due_date: string | null; status: string; overall_rating: number | null;
  employees: { full_name: string; job_title: string | null; department_id: string | null; departments: { name: string } | { name: string }[] | null } | { full_name: string; job_title: string | null; department_id: string | null; departments: { name: string } | { name: string }[] | null }[] | null;
  app_users: { username: string } | { username: string }[] | null;
}

interface ReviewFilters {
  employeeName: string; jobTitle: string; subUnit: string; reviewStatus: string; reviewer: string; fromDate: string; toDate: string; include: "current" | "past" | "both";
}
const EMPTY_REVIEW_FILTERS: ReviewFilters = { employeeName: "", jobTitle: "", subUnit: "", reviewStatus: "", reviewer: "", fromDate: "", toDate: "", include: "current" };

function ReviewsSection({
  mode, employees, jobTitles, departments, myEmployeeId
}: {
  mode: "manage" | "my" | "employee"; employees: EmployeeOption[]; jobTitles: JobTitleOption[]; departments: DepartmentOption[]; myEmployeeId: string | null;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [filters, setFilters] = useState<ReviewFilters>(EMPTY_REVIEW_FILTERS);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase
      .from("performance_reviews")
      .select("id, employee_id, review_period, due_date, status, overall_rating, employees(full_name, job_title, department_id, departments(name)), app_users(username)")
      .order("review_period", { ascending: false });
    setRows((data as unknown as ReviewRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function saveReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("performance_reviews").insert({
      employee_id: form.get("employeeId"),
      review_period: form.get("reviewPeriod"),
      due_date: form.get("dueDate") || null,
      status: "Draft"
    });
    setSaving(false);
    setAdding(false);
    load();
  }

  const title = mode === "manage" ? "Manage Performance Reviews" : mode === "my" ? "My Reviews" : "Employee Reviews";
  const showReviewer = mode === "manage";
  const showSubUnit = mode === "employee";
  const showEmployeeName = mode !== "my";

  const filteredRows = rows.filter((r) => {
    const emp = one(r.employees);
    const reviewer = one(r.app_users);
    if (mode === "my" && r.employee_id !== myEmployeeId) return false;
    if (showEmployeeName && filters.employeeName && !(emp?.full_name ?? "").toLowerCase().includes(filters.employeeName.toLowerCase())) return false;
    if (filters.jobTitle && emp?.job_title !== filters.jobTitle) return false;
    if (showSubUnit && filters.subUnit) {
      const deptName = one(emp?.departments ?? null)?.name;
      if (deptName !== filters.subUnit) return false;
    }
    if (filters.reviewStatus && r.status !== filters.reviewStatus) return false;
    if (showReviewer && filters.reviewer && !(reviewer?.username ?? "").toLowerCase().includes(filters.reviewer.toLowerCase())) return false;
    if (filters.fromDate && r.due_date && r.due_date < filters.fromDate) return false;
    if (filters.toDate && r.due_date && r.due_date > filters.toDate) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 rounded-card border border-surface-border bg-white p-4">
        <h2 className="mb-3 font-display text-base font-medium text-ink">{title}</h2>
        <div className={clsx("grid grid-cols-1 gap-3", showEmployeeName ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3")}>
          {showEmployeeName && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Employee Name</label>
              <div className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2">
                <Search size={14} className="text-ink-soft" />
                <input placeholder="Type for hints..." value={filters.employeeName} onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })} className="w-full bg-transparent text-sm focus:outline-none" />
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Job Title</label>
            <select value={filters.jobTitle} onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })} className={inputCls}>
              <option value="">-- Select --</option>
              {jobTitles.map((j) => <option key={j.id} value={j.title}>{j.title}</option>)}
            </select>
          </div>
          {showSubUnit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Sub Unit</label>
              <select value={filters.subUnit} onChange={(e) => setFilters({ ...filters, subUnit: e.target.value })} className={inputCls}>
                <option value="">-- Select --</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Include</label>
            <select value={filters.include} onChange={(e) => setFilters({ ...filters, include: e.target.value as ReviewFilters["include"] })} className={inputCls}>
              <option value="current">Current Employees Only</option>
              <option value="past">Past Employees Only</option>
              <option value="both">Current and Past Employees</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Review Status</label>
            <select value={filters.reviewStatus} onChange={(e) => setFilters({ ...filters, reviewStatus: e.target.value })} className={inputCls}>
              <option value="">-- Select --</option>
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          {showReviewer && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Reviewer</label>
              <div className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2">
                <Search size={14} className="text-ink-soft" />
                <input placeholder="Type for hints..." value={filters.reviewer} onChange={(e) => setFilters({ ...filters, reviewer: e.target.value })} className="w-full bg-transparent text-sm focus:outline-none" />
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">From Date</label>
            <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">To Date</label>
            <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setFilters(EMPTY_REVIEW_FILTERS)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Reset</button>
        </div>
      </div>

      {mode !== "my" && (
        <div className="mb-3 flex justify-end">
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add</button>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Job Title</th>
              {showSubUnit && <th className="px-4 py-3">Sub Unit</th>}
              <th className="px-4 py-3">Review Period</th>
              <th className="px-4 py-3">Due Date</th>
              {showReviewer && <th className="px-4 py-3">Reviewer</th>}
              <th className="px-4 py-3">Review Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingRows ? <tr><td colSpan={8} className="px-4 py-10 text-center"><Loader2 size={16} className="mx-auto animate-spin text-ink-soft" /></td></tr> : filteredRows.map((r) => {
              const emp = one(r.employees);
              const reviewer = one(r.app_users);
              return (
                <tr key={r.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{emp?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{emp?.job_title ?? "—"}</td>
                  {showSubUnit && <td className="px-4 py-3 text-ink-muted">{one(emp?.departments ?? null)?.name ?? "—"}</td>}
                  <td className="px-4 py-3 text-ink-muted">{r.review_period}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.due_date ?? "—"}</td>
                  {showReviewer && <td className="px-4 py-3 text-ink-muted">{reviewer?.username ?? "—"}</td>}
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={async (e) => {
                        const status = e.target.value;
                        const overall_rating = status === "Completed" ? r.overall_rating ?? 3 : r.overall_rating;
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status, overall_rating } : x)));
                        await supabase.from("performance_reviews").update({ status, overall_rating }).eq("id", r.id);
                      }}
                      className="rounded-full border-0 bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-ink-muted"
                    >
                      <option value="Draft">Draft</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Completed" && (
                      <select
                        value={r.overall_rating ?? 3}
                        onChange={async (e) => {
                          const overall_rating = Number(e.target.value);
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, overall_rating } : x)));
                          await supabase.from("performance_reviews").update({ overall_rating }).eq("id", r.id);
                        }}
                        className="rounded-md border border-surface-border px-2 py-1 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loadingRows && filteredRows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-soft">No Records Found</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add review" onClose={() => setAdding(false)}>
          <form onSubmit={saveReview} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Review Period *</label><input name="reviewPeriod" required placeholder="e.g. H2 2026" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Due Date</label><input name="dueDate" type="date" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// My Trackers / Employee Trackers
// ---------------------------------------------------------------------
interface TrackerRow { id: string; employee_id: string; goal: string; progress: number; employees: { full_name: string } | { full_name: string }[] | null }

function TrackersTab({ mode, employees, myEmployeeId }: { mode: "mine" | "employees"; employees: EmployeeOption[]; myEmployeeId: string | null }) {
  const supabase = createClient();
  const [trackers, setTrackers] = useState<TrackerRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase.from("performance_trackers").select("id, employee_id, goal, progress, employees(full_name)").order("created_at", { ascending: false });
    setTrackers((data as unknown as TrackerRow[]) ?? []);
    setLoadingRows(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const employeeId = mode === "employees" ? form.get("employeeId") : myEmployeeId;
    if (!employeeId) {
      alert("No employee record linked to your account.");
      return;
    }
    setSaving(true);
    await supabase.from("performance_trackers").insert({ employee_id: employeeId, goal: form.get("goal"), progress: 0 });
    setSaving(false);
    setAdding(false);
    load();
  }

  async function updateProgress(id: string, progress: number) {
    setTrackers((prev) => prev.map((t) => (t.id === id ? { ...t, progress } : t)));
    await supabase.from("performance_trackers").update({ progress }).eq("id", id);
  }

  const rows = mode === "mine" ? trackers.filter((t) => t.employee_id === myEmployeeId) : trackers.filter((t) => t.employee_id !== myEmployeeId);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add goal</button>
      </div>
      <div className="space-y-3">
        {loadingRows ? <Loading /> : rows.map((t) => {
          const emp = one(t.employees);
          return (
            <div key={t.id} className="rounded-card border border-surface-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-ink">{t.goal}</p><p className="text-xs text-ink-soft">{emp?.full_name}</p></div>
                <span className="text-sm font-medium text-ink">{t.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full bg-brand-gradient" style={{ width: `${t.progress}%` }} /></div>
              {mode === "mine" && <input type="range" min={0} max={100} value={t.progress} onChange={(e) => updateProgress(t.id, Number(e.target.value))} className="mt-2 w-full" />}
            </div>
          );
        })}
        {!loadingRows && rows.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No Records Found</p>}
      </div>

      {adding && (
        <Modal title="Add goal" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            {mode === "employees" && (
              <div><label className="mb-1 block text-sm font-medium text-ink">Employee *</label><select name="employeeId" required className={inputCls}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            )}
            <div><label className="mb-1 block text-sm font-medium text-ink">Goal *</label><textarea name="goal" required rows={2} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 13th Month Salary — kept honestly un-wired (see notes elsewhere)
// ---------------------------------------------------------------------
function ThirteenthMonthTab() {
  return (
    <div className="max-w-2xl rounded-card border border-state-warning/30 bg-state-warningBg p-4">
      <p className="text-sm font-medium text-state-warning">Not wired to real data</p>
      <p className="mt-2 text-sm text-ink-muted">
        Calculating this correctly needs each employee&apos;s actual monthly salary, and <code className="font-mono text-xs">employees</code> only
        stores a pay grade band (min/max), not an individual figure. Eligibility rule for reference: Seychellois nationals only, excludes
        foreign workers/trainees/probation, capped and tax-exempt at SCR 45,450, due by 31 January — verify current thresholds before an
        actual payroll run.
      </p>
    </div>
  );
}

function AppraisalTab() {
  return (
    <div className="max-w-2xl space-y-4 rounded-card border border-surface-border bg-white p-6">
      <p className="text-sm text-ink-muted">Self-appraisal — a short written reflection to attach to your next review cycle.</p>
      <div><label className="mb-1 block text-sm font-medium text-ink">Key achievements this period</label><textarea rows={3} className={inputCls} /></div>
      <div><label className="mb-1 block text-sm font-medium text-ink">Areas to improve</label><textarea rows={3} className={inputCls} /></div>
      <button className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save draft</button>
      <p className="text-xs text-ink-soft">Not wired yet — no table exists for this until it&apos;s clear whether a draft attaches to a specific review or stands alone.</p>
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={null}>
      <PerformancePageInner />
    </Suspense>
  );
}

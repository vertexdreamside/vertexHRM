"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Plus,
  Trash2,
  CalendarClock,
  ListChecks,
  CalendarDays,
  FileClock,
  Megaphone,
  Sun,
  CalendarCheck,
  Users,
  Sparkles,
  Zap,
  CheckSquare,
  PieChart as PieChartIcon,
  User
} from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import type { MyAction, EmployeeOnLeaveToday, DistributionSlice } from "@/lib/types";

// A livelier accent set specifically for data viz — the UI chrome
// stays neutral, but charts read better with genuine color variety
// regardless of the base theme; this is deliberately a separate
// palette from the brand tokens, not a reversion to a colored UI.
const CHART_COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"];

const SEED_ACTIONS: MyAction[] = [
  { id: "1", text: "Review Marie's leave request", status: "pending" },
  { id: "2", text: "Approve Q3 procurement request", status: "in_progress" }
];

const SEED_LEAVE_TODAY: EmployeeOnLeaveToday[] = [
  { id: "1", name: "Selvan Pillay", leaveType: "Sick Leave" }
];

const SUB_UNIT_DISTRIBUTION: DistributionSlice[] = [
  { name: "HR", value: 1 },
  { name: "Operations", value: 1 },
  { name: "IT", value: 1 },
  { name: "Finance", value: 1 }
];

const LOCATION_DISTRIBUTION: DistributionSlice[] = [
  { name: "Head Office", value: 4 }
];

const QUICK_LAUNCH = [
  { label: "Assign Leave", href: "/leave?tab=assign", icon: CalendarClock },
  { label: "Leave List", href: "/leave?tab=leavelist", icon: ListChecks },
  { label: "Apply Leave", href: "/leave?tab=myleave&apply=1", icon: CalendarDays },
  { label: "My Leave", href: "/leave?tab=myleave", icon: CalendarDays },
  { label: "My Timesheet", href: "/time?tab=mytimesheet", icon: FileClock }
];

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const timeGreeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${timeGreeting}, ${name}` : timeGreeting;
}

export default function DashboardPage() {
  return (
    <div>
      <WelcomeBanner />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TimeAtWorkCard />
          <QuickLaunchCard />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DistributionCard title="Employee distribution by sub unit" data={SUB_UNIT_DISTRIBUTION} />
            <DistributionCard title="Employee distribution by location" data={LOCATION_DISTRIBUTION} />
          </div>
        </div>
        <div className="space-y-6">
          <MyActionsCard />
          <EmployeesOnLeaveCard />
          <BuzzPlaceholderCard />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Welcome banner + live stat tiles
// ---------------------------------------------------------------------
function WelcomeBanner() {
  const supabase = createClient();
  const [stats, setStats] = useState<{ employees: number; pendingLeave: number; openTickets: number } | null>(null);
  const [myFirstName, setMyFirstName] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => {
    async function load() {
      const [empRes, leaveRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending")
      ]);
      setStats({ employees: empRes.count ?? 0, pendingLeave: leaveRes.count ?? 0, openTickets: 0 });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
        if (appUser?.employee_id) {
          const { data: employee } = await supabase.from("employees").select("full_name").eq("id", appUser.employee_id).single();
          if (employee?.full_name) setMyFirstName(employee.full_name.split(" ")[0]);
        }
      }
    }
    load();
  }, [supabase]);

  return (
    <div className="relative overflow-hidden rounded-card bg-brand-gradient p-6 text-white sm:p-8">
      <Sparkles className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-white/10" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-white/70">
            <Sun size={14} /> {today}
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium sm:text-3xl">{greeting(myFirstName)}.</h1>
          <p className="mt-1 text-sm text-white/80">Here&apos;s what&apos;s happening across the organization today.</p>
        </div>

        <div className="flex gap-3">
          <StatTile icon={Users} label="Active employees" value={stats?.employees} />
          <StatTile icon={CalendarCheck} label="Leave pending" value={stats?.pendingLeave} />
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/70">
        <Icon size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-medium">{value ?? "—"}</p>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  accent,
  children
}: {
  title: string;
  icon?: typeof Clock;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-card border border-surface-border bg-white p-5 transition-shadow hover:shadow-md">
      <h2 className={clsx("flex items-center gap-2 font-display text-base font-medium", accent ?? "text-ink")}>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Icon size={14} />
          </span>
        )}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Time at Work — punch in/out + weekly hours
// ---------------------------------------------------------------------
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function TimeAtWorkCard() {
  const supabase = createClient();
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [openPunchId, setOpenPunchId] = useState<string | null>(null);
  const [lastPunchOut, setLastPunchOut] = useState<Date | null>(null);
  const [weekData, setWeekData] = useState<{ day: string; hours: number }[]>(
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, hours: 0 }))
  );
  const [todayHours, setTodayHours] = useState(0);
  const [myPhotoUrl, setMyPhotoUrl] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  async function loadPunches(employeeId: string) {
    const weekStart = startOfWeek(new Date());
    const { data: punches } = await supabase
      .from("time_punches")
      .select("punch_in, punch_out")
      .eq("employee_id", employeeId)
      .gte("punch_in", weekStart.toISOString())
      .order("punch_in", { ascending: true });

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totals = days.map((day) => ({ day, hours: 0 }));
    const todayStr = new Date().toDateString();
    let todayTotal = 0;

    for (const p of punches ?? []) {
      const start = new Date(p.punch_in);
      const end = p.punch_out ? new Date(p.punch_out) : new Date();
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
      const dayIndex = (start.getDay() + 6) % 7; // Mon=0 ... Sun=6
      totals[dayIndex].hours = Math.round((totals[dayIndex].hours + hours) * 10) / 10;
      if (start.toDateString() === todayStr) todayTotal += hours;
    }
    setWeekData(totals);
    setTodayHours(Math.round(todayTotal * 10) / 10);

    const { data: lastClosed } = await supabase
      .from("time_punches")
      .select("punch_out")
      .eq("employee_id", employeeId)
      .not("punch_out", "is", null)
      .order("punch_out", { ascending: false })
      .limit(1)
      .single();
    if (lastClosed?.punch_out) setLastPunchOut(new Date(lastClosed.punch_out));
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      const employeeId = appUser?.employee_id ?? null;
      setMyEmployeeId(employeeId);
      if (!employeeId) return;

      const { data: employee } = await supabase.from("employees").select("full_name, photo_url").eq("id", employeeId).single();
      if (employee) {
        setMyName(employee.full_name);
        setMyPhotoUrl(employee.photo_url);
      }

      const { data: openPunch } = await supabase
        .from("time_punches")
        .select("id, punch_in")
        .eq("employee_id", employeeId)
        .is("punch_out", null)
        .order("punch_in", { ascending: false })
        .limit(1)
        .single();

      if (openPunch) {
        setOpenPunchId(openPunch.id);
        setPunchedIn(true);
        setPunchTime(new Date(openPunch.punch_in));
      }
      loadPunches(employeeId);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!punchedIn || !punchTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - punchTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [punchedIn, punchTime]);

  async function togglePunch() {
    if (!myEmployeeId) {
      alert("Your login isn't linked to an employee record yet — ask an admin to link it in Users.");
      return;
    }

    if (punchedIn && openPunchId) {
      const punchOutTime = new Date();
      await supabase.from("time_punches").update({ punch_out: punchOutTime.toISOString() }).eq("id", openPunchId);
      setPunchedIn(false);
      setPunchTime(null);
      setElapsed(0);
      setOpenPunchId(null);
      setLastPunchOut(punchOutTime);
      loadPunches(myEmployeeId);
    } else {
      const { data } = await supabase.from("time_punches").insert({ employee_id: myEmployeeId }).select("id, punch_in").single();
      if (data) {
        setOpenPunchId(data.id);
        setPunchedIn(true);
        setPunchTime(new Date(data.punch_in));
      }
    }
  }

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const weekTotal = Math.round(weekData.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;
  const liveTodayHours = punchedIn ? Math.round((todayHours + elapsed / 3600) * 10) / 10 : todayHours;

  return (
    <Card title="Time at work" icon={Clock}>
      <div className="mb-4 flex items-center gap-3 border-b border-surface-border pb-4">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-surface-subtle">
          {myPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={myPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={18} className="text-ink-soft" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{myName ?? "You"}</p>
          <p className="text-xs text-ink-soft">
            {punchedIn
              ? "Currently punched in"
              : lastPunchOut
                ? `Last punched out ${lastPunchOut.toLocaleDateString()} at ${lastPunchOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "No punches recorded yet"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx("flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform group-hover:scale-105", punchedIn ? "bg-state-success" : "bg-brand-gradient")}>
            <Clock size={18} />
          </div>
          <div>
            <p className="font-mono text-lg font-medium text-ink">
              {hh}:{mm}:{ss}
            </p>
            <p className="text-xs text-ink-soft">
              {punchedIn ? "This session" : "Ready to punch in"}
            </p>
          </div>
        </div>
        <button
          onClick={togglePunch}
          className={clsx(
            "rounded-md px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.03]",
            punchedIn ? "bg-state-danger hover:opacity-90" : "bg-state-success hover:opacity-90"
          )}
        >
          {punchedIn ? "Punch Out" : "Punch In"}
        </button>
      </div>

      {/* Today's hours */}
      <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-subtle px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Sun size={13} /></span>
        <span className="text-xs text-ink-muted">Today</span>
        <span className="ml-auto font-mono text-sm font-medium text-ink">{liveTodayHours}h</span>
      </div>

      <div className="mt-4 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekData}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7b7b93" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#f6f6fb" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-700"><CalendarDays size={11} /></span>
        This week &middot; <span className="font-medium text-ink">{weekTotal}h total</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// My Actions
// ---------------------------------------------------------------------
function MyActionsCard() {
  const [actions, setActions] = useState<MyAction[]>(SEED_ACTIONS);
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    setActions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: draft.trim(), status: "pending" }
    ]);
    setDraft("");
  }

  function cycleStatus(id: string) {
    const order: MyAction["status"][] = ["pending", "in_progress", "completed"];
    setActions((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: order[(order.indexOf(a.status) + 1) % order.length] }
          : a
      )
    );
  }

  function remove(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  const statusStyles: Record<MyAction["status"], string> = {
    pending: "bg-surface-subtle text-ink-muted",
    in_progress: "bg-state-warningBg text-state-warning",
    completed: "bg-state-successBg text-state-success"
  };
  const statusLabels: Record<MyAction["status"], string> = {
    pending: "Pending",
    in_progress: "In progress",
    completed: "Completed"
  };

  return (
    <Card title="My actions" icon={CheckSquare}>
      <div className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task..."
          className="w-full rounded-md border border-surface-border px-3 py-1.5 text-sm focus:border-brand-500"
        />
        <button
          onClick={add}
          aria-label="Add task"
          className="rounded-md bg-state-success p-1.5 text-white hover:opacity-90"
        >
          <Plus size={16} />
        </button>
      </div>
      <ul className="space-y-2">
        {actions.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2 text-sm transition-colors hover:border-brand-200"
          >
            <span className="text-ink">{a.text}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => cycleStatus(a.id)}
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  statusStyles[a.status]
                )}
              >
                {statusLabels[a.status]}
              </button>
              <button
                onClick={() => remove(a.id)}
                aria-label="Remove task"
                className="text-ink-soft hover:text-state-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {actions.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-soft">Nothing on your list.</p>
        )}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Quick Launch
// ---------------------------------------------------------------------
function QuickLaunchCard() {
  return (
    <Card title="Quick launch" icon={Zap}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {QUICK_LAUNCH.map(({ label, href, icon: Icon }, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <Link
              key={label}
              href={href}
              className="group/tile flex flex-col items-center gap-2 rounded-md border border-surface-border p-3 text-center transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-lg"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 group-hover/tile:scale-110 group-hover/tile:rotate-6"
                style={{ backgroundColor: color }}
              >
                <Icon size={18} />
              </span>
              <span className="text-xs text-ink-muted">{label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Employees on Leave Today
// ---------------------------------------------------------------------
function EmployeesOnLeaveCard() {
  return (
    <Card title="Employees on leave today" icon={CalendarDays}>
      {SEED_LEAVE_TODAY.length === 0 ? (
        <p className="text-sm text-ink-soft">No one is on leave today.</p>
      ) : (
        <ul className="space-y-2">
          {SEED_LEAVE_TODAY.map((e) => (
            <li key={e.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{e.name}</span>
              <span className="rounded-full bg-state-warningBg px-2 py-0.5 text-xs font-medium text-state-warning">{e.leaveType}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Buzz
// ---------------------------------------------------------------------
function BuzzPlaceholderCard() {
  return (
    <Card title="Buzz — latest posts" icon={Megaphone}>
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Megaphone size={18} />
        </span>
        <p className="text-sm text-ink-soft">See the full feed on the Buzz page.</p>
        <Link href="/buzz" className="text-sm font-medium text-brand-700 hover:underline">
          Open Buzz →
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Distribution pie charts
// ---------------------------------------------------------------------
function DistributionCard({
  title,
  data
}: {
  title: string;
  data: DistributionSlice[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <Card title={title} icon={PieChartIcon}>
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-medium text-ink">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-soft">total</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

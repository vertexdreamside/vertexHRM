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
  Megaphone
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

const PIE_COLORS = ["#2f3fd9", "#5f3fd8", "#7b3fd9", "#a78bfa", "#c7d2fe"];

const SEED_ACTIONS: MyAction[] = [
  { id: "1", text: "Review Marie's leave request", status: "pending" },
  { id: "2", text: "Approve Q3 procurement request", status: "in_progress" }
];

const SEED_LEAVE_TODAY: EmployeeOnLeaveToday[] = [
  { id: "1", name: "Selvan Pillay", leaveType: "Sick Leave" }
];

const WEEKLY_HOURS = [
  { day: "Mon", hours: 8 },
  { day: "Tue", hours: 7.5 },
  { day: "Wed", hours: 8 },
  { day: "Thu", hours: 8 },
  { day: "Fri", hours: 6 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 0 }
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
  { label: "Assign Leave", href: "/leave", icon: CalendarClock },
  { label: "Leave List", href: "/leave", icon: ListChecks },
  { label: "Apply Leave", href: "/leave", icon: CalendarDays },
  { label: "My Leave", href: "/leave", icon: CalendarDays },
  { label: "My Timesheet", href: "/leave", icon: FileClock }
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Your day at a glance.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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

function Card({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-surface-border bg-white p-5">
      <h2 className="font-display text-base font-medium text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Time at Work — punch in/out + weekly hours
// ---------------------------------------------------------------------
function TimeAtWorkCard() {
  const supabase = createClient();
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [openPunchId, setOpenPunchId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      const employeeId = appUser?.employee_id ?? null;
      setMyEmployeeId(employeeId);
      if (!employeeId) return;

      // Resume an already-open punch from earlier today, if any —
      // otherwise refreshing the page would silently lose the "still
      // punched in" state even though the database row is still open.
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
      await supabase.from("time_punches").update({ punch_out: new Date().toISOString() }).eq("id", openPunchId);
      setPunchedIn(false);
      setPunchTime(null);
      setElapsed(0);
      setOpenPunchId(null);
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

  return (
    <Card title="Time at work">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Clock size={22} />
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-ink">
              {hh}:{mm}:{ss}
            </p>
            <p className="text-xs text-ink-soft">
              {punchedIn ? "Currently punched in" : "Not punched in"}
            </p>
          </div>
        </div>
        <button
          onClick={togglePunch}
          className={clsx(
            "rounded-md px-5 py-2.5 text-sm font-medium text-white",
            punchedIn ? "bg-state-danger hover:opacity-90" : "bg-brand-gradient hover:opacity-90"
          )}
        >
          {punchedIn ? "Punch Out" : "Punch In"}
        </button>
      </div>

      <div className="mt-5 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={WEEKLY_HOURS}>
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#7b7b93" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#f6f6fb" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#5f3fd8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-ink-soft">This week</p>
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
    <Card title="My actions">
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
          className="rounded-md bg-brand-gradient p-1.5 text-white hover:opacity-90"
        >
          <Plus size={16} />
        </button>
      </div>
      <ul className="space-y-2">
        {actions.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-md border border-surface-border px-3 py-2 text-sm"
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
    <Card title="Quick launch">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {QUICK_LAUNCH.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 rounded-md border border-surface-border p-3 text-center hover:bg-surface-subtle"
          >
            <Icon size={20} className="text-brand-700" />
            <span className="text-xs text-ink-muted">{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Employees on Leave Today
// ---------------------------------------------------------------------
function EmployeesOnLeaveCard() {
  return (
    <Card title="Employees on leave today">
      {SEED_LEAVE_TODAY.length === 0 ? (
        <p className="text-sm text-ink-soft">No one is on leave today.</p>
      ) : (
        <ul className="space-y-2">
          {SEED_LEAVE_TODAY.map((e) => (
            <li key={e.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{e.name}</span>
              <span className="text-ink-muted">{e.leaveType}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Buzz — latest posts (now that Buzz exists, links there)
// ---------------------------------------------------------------------
function BuzzPlaceholderCard() {
  return (
    <Card title="Buzz — latest posts">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Megaphone size={20} className="text-ink-soft" />
        <p className="text-sm text-ink-soft">
          See the full feed on the Buzz page.
        </p>
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
  return (
    <Card title={title}>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4f0" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

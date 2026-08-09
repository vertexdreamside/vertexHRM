"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TourStep {
  target: string; // data-tour value
  title: string;
  body: string;
}

// Grouped into two content tracks rather than one per literal job
// title (Lecturer, Librarian, etc.) — those don't exist as roles in
// this system. The real roles are System Administrator, HR Manager,
// HR Officer, Supervisor, Employee, and Auditor; "manager" below
// covers the first four (anyone with broader view/approve access),
// "employee" covers the latter two (self-service-focused).
const MANAGER_STEPS: TourStep[] = [
  { target: "main-content", title: "Welcome to Vertex HRM", body: "This is your Dashboard — a live view of your team, pending approvals, and your own time/leave, all in one place." },
  { target: "sidebar-logo", title: "You're always oriented", body: "This logo and the sidebar next to it stay put wherever you go — it's how you'll always find your way back to Dashboard." },
  { target: "sidebar-search", title: "Jump anywhere, fast", body: "Search here (or press \u2318K) to jump straight to any page — no need to hunt through menus." },
  { target: "sidebar-nav", title: "Your modules", body: "Admin, PIM, Leave, Time, Recruitment, Performance, and more — as a manager or admin, you'll use several of these to manage your team, not just yourself." },
  { target: "sidebar-adminops", title: "A separate space for operations", body: "Admin Operations is a distinct area for office-admin tasks — requests, procurement, IT support, assets — separate from HR data." },
  { target: "topbar-notifications", title: "What's waiting on you", body: "This shows real pending counts — leave requests, timesheets, and claims that need your decision." },
  { target: "topbar-account", title: "Your account", body: "Change your password, reach Support, or open the Help Centre from here." },
  { target: "help-link", title: "You're ready to start using Vertex HRM", body: "The Help Centre has step-by-step guides any time you need them. You can restart this tour from there too." }
];

const EMPLOYEE_STEPS: TourStep[] = [
  { target: "main-content", title: "Welcome to Vertex HRM", body: "This is your Dashboard — your punch clock, your leave balance, and quick links to the things you'll use most." },
  { target: "sidebar-logo", title: "You're always oriented", body: "This logo and the sidebar next to it stay put wherever you go — it's how you'll always find your way back to Dashboard." },
  { target: "sidebar-search", title: "Jump anywhere, fast", body: "Search here (or press \u2318K) to jump straight to any page — no need to hunt through menus." },
  { target: "sidebar-nav", title: "Your modules", body: "Leave, Time, My Info, and Performance are where you'll spend most of your time — apply for leave, submit timesheets, and track your own goals." },
  { target: "topbar-notifications", title: "What's waiting on you", body: "Any pending items relevant to you show up here." },
  { target: "topbar-account", title: "Your account", body: "Change your password, reach Support, or open the Help Centre from here." },
  { target: "help-link", title: "You're ready to start using Vertex HRM", body: "The Help Centre has step-by-step guides any time you need them. You can restart this tour from there too." }
];

const MANAGER_ROLES = new Set(["System Administrator", "HR Manager", "HR Officer", "Supervisor"]);

// "Restart Tour" (Help Centre) dispatches this event rather than
// taking a prop — GuidedTour lives once in the persistent dashboard
// layout so it survives client-side navigation (starting the tour
// pushes the user to /dashboard, which would unmount a component
// rendered inside a page instead of the layout).
export const RESTART_TOUR_EVENT = "vertexhrm:restart-tour";

export function GuidedTour() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>(EMPLOYEE_STEPS);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const markSeen = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("app_users").update({ has_seen_tour: true }).eq("id", user.id);
  }, [supabase]);

  const startTour = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: appUser } = await supabase.from("app_users").select("role_id, roles(name)").eq("id", user.id).single();
      const roleName = appUser ? (Array.isArray(appUser.roles) ? appUser.roles[0]?.name : (appUser.roles as { name: string } | null)?.name) : null;
      setSteps(roleName && MANAGER_ROLES.has(roleName) ? MANAGER_STEPS : EMPLOYEE_STEPS);
    }
    setStepIndex(0);
    if (pathname !== "/dashboard") router.push("/dashboard");
    setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, pathname]);

  useEffect(() => {
    window.addEventListener(RESTART_TOUR_EVENT, startTour);
    return () => window.removeEventListener(RESTART_TOUR_EVENT, startTour);
  }, [startTour]);

  useEffect(() => {
    async function checkFirstLogin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: appUser } = await supabase.from("app_users").select("has_seen_tour, role_id, roles(name)").eq("id", user.id).single();
      if (appUser && !appUser.has_seen_tour) {
        const roleName = Array.isArray(appUser.roles) ? appUser.roles[0]?.name : (appUser.roles as { name: string } | null)?.name;
        setSteps(roleName && MANAGER_ROLES.has(roleName) ? MANAGER_STEPS : EMPLOYEE_STEPS);
        if (pathname !== "/dashboard") {
          router.push("/dashboard");
        }
        setActive(true);
      }
    }
    checkFirstLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    function updateRect() {
      const el = document.querySelector(`[data-tour="${steps[stepIndex].target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }
    // Small delay lets scroll-into-view / route change settle before measuring.
    const t = setTimeout(updateRect, 150);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, stepIndex, steps]);

  async function finish() {
    setActive(false);
    await markSeen();
  }

  async function skip() {
    await finish();
  }

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finish();
    }
  }

  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  if (!active) return null;

  const step = steps[stepIndex];
  const tooltipTop = rect ? Math.min(rect.bottom + 12, window.innerHeight - 200) : window.innerHeight / 2 - 80;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 336) : window.innerWidth / 2 - 160;

  return (
    <div className="fixed inset-0 z-50">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-amber-400 transition-all duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15,15,20,0.65)"
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-ink/65" />
      )}

      <div
        className="fixed z-50 w-80 rounded-card bg-white p-4 shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-medium text-ink">{step.title}</h3>
          <button onClick={skip} aria-label="Close tour" className="text-ink-soft hover:text-ink"><X size={16} /></button>
        </div>
        <p className="mt-2 text-sm text-ink-muted">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === stepIndex ? "bg-brand-gradient" : "bg-surface-border"}`} />
            ))}
          </div>
          <span className="text-xs text-ink-soft">{stepIndex + 1} / {steps.length}</span>
        </div>

        {stepIndex === steps.length - 1 && (
          <label className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
            Don&apos;t show this again
          </label>
        )}

        <div className="mt-4 flex justify-between gap-2">
          <button onClick={skip} className="text-xs font-medium text-ink-soft hover:text-ink">Skip</button>
          <div className="flex gap-2">
            {stepIndex > 0 && <button onClick={back} className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-subtle">Back</button>}
            <button onClick={next} className="rounded-md bg-state-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              {stepIndex < steps.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

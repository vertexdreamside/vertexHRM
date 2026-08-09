"use client";

import { useMemo, useState } from "react";
import { Search, BookOpen, ChevronDown, PlayCircle } from "lucide-react";
import { clsx } from "clsx";
import { RESTART_TOUR_EVENT } from "@/components/onboarding/GuidedTour";

interface HelpArticle {
  category: string;
  title: string;
  body: string[];
}

// Real, written content — not placeholder text. Organized so each
// article is self-contained (title + body paragraphs) and searchable
// by simple substring match across title/body/category.
const ARTICLES: HelpArticle[] = [
  {
    category: "Getting Started",
    title: "What is Vertex HRM?",
    body: [
      "Vertex HRM is the HR and administration platform used to manage employees, leave, time, performance, recruitment, claims, and day-to-day admin operations in one place.",
      "It's organized into two spaces: the main HRM area (everything in the left sidebar — Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Directory, Maintenance, Claims, Buzz, Dashboard) and a separate Admin Operations space (reached via 'Admin Operations' at the bottom of the sidebar) for office-operations tasks like Requests, Procurement, IT Support, Assets, and Inventory."
    ]
  },
  {
    category: "Getting Started",
    title: "Understanding the Dashboard",
    body: [
      "The Dashboard is your home screen after logging in. It shows a personalized greeting, your Time at Work widget (punch in/out, today's and this week's hours), Quick Launch shortcuts to common actions, your pending actions, who's on leave today, recent Buzz posts, and organization-wide distribution charts.",
      "Punch in/out directly from the Time at Work widget — your live timer and weekly hours update automatically as you do."
    ]
  },
  {
    category: "Getting Started",
    title: "User roles and permissions",
    body: [
      "Every login is assigned a Role (e.g. System Administrator, HR Manager, HR Officer, Supervisor, Employee, Auditor). Each role has its own permissions per module — view, add, edit, delete, and approve — configured in Admin \u2192 Roles & Permissions.",
      "What you see in the sidebar and what actions are available to you (buttons, edit/delete icons) are both governed by your role. If something looks missing that you expect to have, it's most likely a permissions question for your System Administrator, not a bug."
    ]
  },
  {
    category: "My Info & Leave",
    title: "Applying for leave",
    body: [
      "Go to Leave \u2192 Apply. Choose a leave type, select your From and To dates (weekends are excluded from the day count automatically), add a reason if needed, and submit.",
      "You can track the status of your request under Leave \u2192 My Leave, and cancel it there too, as long as it's still Pending."
    ]
  },
  {
    category: "My Info & Leave",
    title: "Checking your leave balance",
    body: [
      "Go to Leave \u2192 Entitlements \u2192 My Entitlements to see your entitlement for each leave type and a running total of days due.",
      "For a fuller breakdown — entitlement, taken, scheduled, and pending-approval days per leave type over a period — use Leave \u2192 Reports \u2192 My Leave Entitlements and Usage Report."
    ]
  },
  {
    category: "My Info & Leave",
    title: "Updating your personal information",
    body: [
      "Go to My Info in the sidebar. Your profile is organized into tabs: Personal Details, Contact Details, Emergency Contacts, Dependents, Immigration, Job, Salary, Report-to, Qualifications (work experience, education, skills, certifications, and languages), and Memberships.",
      "Skills and certifications support an expiry date — if one is set, you'll see an 'Expires in Xd' or 'Expired' badge right on the record once it's within 30 days."
    ]
  },
  {
    category: "Time",
    title: "Submitting a timesheet",
    body: [
      "Go to Time \u2192 Timesheets \u2192 My Timesheets. Enter hours against each project for the current week, then press Submit timesheet. Once submitted, it's locked until your manager approves or rejects it.",
      "Punching in/out (for attendance) is separate from timesheets and happens on the Dashboard's Time at Work widget."
    ]
  },
  {
    category: "Performance",
    title: "Setting and tracking goals",
    body: [
      "Go to Performance \u2192 Goals & OKRs. Add a goal with a type, target value, due date, and optional weight. Update its current value any time to track progress automatically.",
      "A goal can optionally link up to a parent Department/Company/Operational goal ('Contributes to') so individual work visibly rolls up into bigger objectives."
    ]
  },
  {
    category: "Performance",
    title: "Quarterly check-ins",
    body: [
      "Go to Performance \u2192 Quarterly Check-Ins \u2192 Start check-in. You'll submit a short self-reflection first (achievements, what's on/behind track, support needed); once submitted, your manager's section unlocks for their summary and an outcome rating.",
      "This is intentionally lightweight — a structured conversation, not a full appraisal. Formal reviews live separately under Manage Reviews."
    ]
  },
  {
    category: "Performance",
    title: "Completing a performance review",
    body: [
      "Managers/HR: go to Performance \u2192 Manage Reviews, find the review, and press Open. The review view shows the employee's active goals as context, then a KPI-by-KPI rating and comment form for their job title's configured KPIs.",
      "Overall rating is calculated automatically as the average of the KPI ratings you enter — press Complete when finished, or Save to come back to it later."
    ]
  },
  {
    category: "Admin",
    title: "Adding a new employee",
    body: [
      "Go to PIM \u2192 Add Employee. Fill in personal, job, and contact details. You can optionally upload a photo and enable 'Create Login Details' in the same form to set up their username and password together with the employee record, rather than as two separate steps."
    ]
  },
  {
    category: "Admin",
    title: "Managing roles and permissions",
    body: [
      "Go to Admin \u2192 Roles & Permissions. Select a role, and toggle view/add/edit/delete/approve per module. Changes are logged to the audit trail."
    ]
  },
  {
    category: "Admin",
    title: "Data cleanup and retention (Maintenance)",
    body: [
      "Maintenance is a narrow, deliberately separate tool for permanently deleting old records past their useful retention period (Leave Requests, Timesheets, Claims, the Audit Log, or Candidate Records) — not a general admin dashboard.",
      "It requires re-entering your password before use, always shows a preview count before anything is deleted, and every purge is logged. Only System Administrators can access it."
    ]
  },
  {
    category: "Troubleshooting",
    title: "I can't see a menu I expect to have access to",
    body: [
      "This is almost always a Roles & Permissions setting, not a bug — ask your System Administrator to check Admin \u2192 Roles & Permissions for your role.",
      "It can also mean the whole module has been disabled organization-wide in Admin \u2192 Configuration \u2192 Modules."
    ]
  },
  {
    category: "Troubleshooting",
    title: "My changes aren't saving",
    body: [
      "Check for an error message near the form — most save actions now show a specific reason if something fails (a required field, a duplicate value, etc.) rather than failing silently.",
      "If a save appears to succeed but the data isn't there after refreshing, that's worth reporting — note exactly which page and field."
    ]
  },
  {
    category: "Troubleshooting",
    title: "I forgot my password",
    body: [
      "On the login page, click 'Forgot Password?' and enter your email. You'll receive a reset link if an account exists for that address."
    ]
  }
];

const FAQ = [
  { q: "Who can see my personal information?", a: "Your own record is visible to you, your manager, and roles with employee-data permissions (typically HR). Exactly who can see what is governed by Roles & Permissions, configured by your System Administrator." },
  { q: "Can I edit a leave request after submitting it?", a: "Not directly — cancel it from Leave \u2192 My Leave while it's still Pending, then submit a new one." },
  { q: "What's the difference between Quarterly Check-Ins and a Performance Review?", a: "Check-ins are short and informal, meant to happen every quarter without much overhead. Reviews (under Manage Reviews) are the formal, KPI-based evaluation tied to a review period." },
  { q: "What's the difference between Buzz and Admin Operations \u2192 Communication?", a: "Buzz is the social/recognition feed (photos, likes, comments). Communication is for formal, organization-wide announcements." },
  { q: "Where do I report a bug or ask for help beyond this guide?", a: "Use the Support option in the account menu (top-right) to reach a person directly." }
];

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["Getting Started"]));

  const categories = useMemo(() => [...new Set(ARTICLES.map((a) => a.category))], []);

  const filtered = useMemo(() => {
    if (!query.trim()) return ARTICLES;
    const q = query.toLowerCase();
    return ARTICLES.filter(
      (a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.body.some((p) => p.toLowerCase().includes(q))
    );
  }, [query]);

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white"><BookOpen size={18} /></span>
          <div>
            <h1 className="font-display text-2xl font-medium text-ink">Help Centre</h1>
            <p className="text-sm text-ink-muted">How to use Vertex HRM.</p>
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent(RESTART_TOUR_EVENT))}
          className="flex items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
        >
          <PlayCircle size={15} /> Restart Tour
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2 rounded-md border border-surface-border bg-white px-4 py-3">
        <Search size={16} className="text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Help Centre..."
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {query.trim() ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-ink-soft">{filtered.length} result(s)</p>
          {filtered.map((a) => (
            <div key={a.title} className="rounded-card border border-surface-border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{a.category}</p>
              <h3 className="mt-1 font-medium text-ink">{a.title}</h3>
              {a.body.map((p, i) => <p key={i} className="mt-2 text-sm text-ink-muted">{p}</p>)}
            </div>
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No articles match &quot;{query}&quot;.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const open = openCategories.has(cat);
            const catArticles = ARTICLES.filter((a) => a.category === cat);
            return (
              <div key={cat} className="overflow-hidden rounded-card border border-surface-border bg-white">
                <button onClick={() => toggleCategory(cat)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <span className="font-medium text-ink">{cat}</span>
                  <ChevronDown size={16} className={clsx("text-ink-soft transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className="divide-y divide-surface-border border-t border-surface-border">
                    {catArticles.map((a) => (
                      <div key={a.title} className="p-4">
                        <h3 className="font-medium text-ink">{a.title}</h3>
                        {a.body.map((p, i) => <p key={i} className="mt-2 text-sm text-ink-muted">{p}</p>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="overflow-hidden rounded-card border border-surface-border bg-white">
            <div className="px-4 py-3 font-medium text-ink">Frequently Asked Questions</div>
            <div className="divide-y divide-surface-border border-t border-surface-border">
              {FAQ.map((f) => (
                <div key={f.q} className="p-4">
                  <p className="font-medium text-ink">{f.q}</p>
                  <p className="mt-1 text-sm text-ink-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

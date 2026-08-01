"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ShieldCheck,
  IdCard,
  Contact,
  CalendarDays,
  Clock3,
  UserSearch,
  UserCircle,
  Target,
  Receipt,
  Wrench,
  Megaphone,
  FileText,
  ChevronDown
} from "lucide-react";

type NavLeaf = { label: string; href: string };
type NavGroup =
  | { type: "link"; key: string; label: string; href: string; icon: typeof LayoutDashboard }
  | { type: "group"; key: string; label: string; icon: typeof LayoutDashboard; items: NavLeaf[] };

// Structure matches the requested menu layout: Admin first, then PIM,
// Directory, Leave, Time, Recruitment, My Info, Performance, and the
// remaining single-page modules after. Query params (?tab=..., ?new=1,
// ?apply=1) deep-link into the right tab/state on pages that already
// have tabs — see each page's own searchParams handling.
const NAV: NavGroup[] = [
  { type: "link", key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    type: "group", key: "admin", label: "Admin", icon: ShieldCheck,
    items: [
      { label: "System Users", href: "/admin/users" },
      { label: "User Roles", href: "/admin/roles" },
      { label: "Job", href: "/admin/job-section" },
      { label: "Organization", href: "/admin/organization" },
      { label: "Qualifications", href: "/admin/qualifications" },
      { label: "Nationalities", href: "/admin/qualifications?tab=nationalities" },
      { label: "Corporate Branding", href: "/admin/branding" },
      { label: "Configuration", href: "/admin/configuration" },
      { label: "Compliance", href: "/admin/compliance" }
    ]
  },
  {
    type: "group", key: "pim", label: "PIM", icon: IdCard,
    items: [
      { label: "Employee List", href: "/pim" },
      { label: "Add Employee", href: "/pim?new=1" },
      { label: "Configuration", href: "/pim/configuration" },
      { label: "Reports", href: "/pim/reports" }
    ]
  },
  { type: "link", key: "directory", label: "Directory", href: "/directory", icon: Contact },
  {
    type: "group", key: "leave", label: "Leave", icon: CalendarDays,
    items: [
      { label: "Apply", href: "/leave?tab=myleave&apply=1" },
      { label: "My Leave", href: "/leave?tab=myleave" },
      { label: "Entitlements", href: "/leave?tab=entitlements" },
      { label: "Leave List", href: "/leave?tab=leavelist" },
      { label: "Assign Leave", href: "/leave?tab=assign" },
      { label: "Configure", href: "/leave?tab=configure" },
      { label: "Reports", href: "/leave?tab=reports" }
    ]
  },
  {
    type: "group", key: "time", label: "Time", icon: Clock3,
    items: [
      { label: "Timesheets", href: "/time?tab=mytimesheet" },
      { label: "Attendance", href: "/time?tab=attendance" },
      { label: "Project Info", href: "/time?tab=projects" },
      { label: "Reports", href: "/time?tab=reports" }
    ]
  },
  {
    type: "group", key: "recruitment", label: "Recruitment", icon: UserSearch,
    items: [
      { label: "Candidates", href: "/recruitment?tab=candidates" },
      { label: "Vacancies", href: "/recruitment?tab=vacancies" }
    ]
  },
  { type: "link", key: "myinfo", label: "My Info", href: "/myinfo", icon: UserCircle },
  {
    type: "group", key: "performance", label: "Performance", icon: Target,
    items: [
      { label: "Configure", href: "/performance?tab=kpis" },
      { label: "Manage Reviews", href: "/performance?tab=reviews" },
      { label: "My Trackers", href: "/performance?tab=mytrackers" },
      { label: "Employee Trackers", href: "/performance?tab=employeetrackers" },
      { label: "13th Month Salary", href: "/performance?tab=thirteenthmonth" },
      { label: "Appraisal", href: "/performance?tab=appraisal" }
    ]
  },
  { type: "link", key: "claims", label: "Claims", href: "/claims", icon: Receipt },
  { type: "link", key: "maintenance", label: "Maintenance", href: "/maintenance", icon: Wrench },
  { type: "link", key: "buzz", label: "Buzz", href: "/buzz", icon: Megaphone },
  { type: "link", key: "documents", label: "Documents", href: "/documents", icon: FileText }
];

function groupContainsPath(items: NavLeaf[], pathname: string) {
  return items.some((item) => pathname === item.href.split("?")[0]);
}

export function Sidebar() {
  const pathname = usePathname();
  const initiallyExpanded = new Set(
    NAV.filter((n) => n.type === "group" && groupContainsPath(n.items, pathname)).map((n) => n.key)
  );
  const [expanded, setExpanded] = useState<Set<string>>(initiallyExpanded);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-surface-border bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/vertexhrm-icon-gradient.svg" alt="" width={28} height={28} aria-hidden="true" />
        <span className="font-display text-lg font-medium text-ink">vertexhrm</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pb-4">
        {NAV.map((item) => {
          if (item.type === "link") {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-brand-50 font-medium text-brand-700" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                )}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {item.label}
              </Link>
            );
          }

          const isOpen = expanded.has(item.key);
          const groupActive = groupContainsPath(item.items, pathname);
          const Icon = item.icon;

          return (
            <div key={item.key}>
              <button
                onClick={() => toggle(item.key)}
                aria-expanded={isOpen}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  groupActive ? "font-medium text-brand-700" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                )}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  size={14}
                  className={clsx("transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="ml-[1.375rem] space-y-0.5 border-l border-surface-border pl-4">
                  {item.items.map((leaf) => {
                    const leafActive = pathname === leaf.href.split("?")[0];
                    return (
                      <Link
                        key={leaf.href}
                        href={leaf.href}
                        className={clsx(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          leafActive ? "bg-brand-50 font-medium text-brand-700" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                        )}
                      >
                        {leaf.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-ink-soft">Round Table Seychelles &middot; v0.1</div>
    </aside>
  );
}

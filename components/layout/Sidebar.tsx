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
  ArrowLeftRight,
  ChevronLeft
} from "lucide-react";

// Flat, top-level only — no nested expansion in the sidebar itself.
// Each module's own sub-sections live in that module's own page
// (e.g. Job Section's internal tab row), not in a sidebar dropdown.
//
// Admin Operations (Documents, and later Requests/Procurement/etc.)
// is NOT listed here — it's a deliberately separate space, entered
// via the link at the bottom of this sidebar.
const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "admin", label: "Admin", href: "/admin/users", icon: ShieldCheck },
  { key: "pim", label: "PIM", href: "/pim", icon: IdCard },
  { key: "leave", label: "Leave", href: "/leave", icon: CalendarDays },
  { key: "time", label: "Time", href: "/time", icon: Clock3 },
  { key: "recruitment", label: "Recruitment", href: "/recruitment", icon: UserSearch },
  { key: "myinfo", label: "My Info", href: "/myinfo", icon: UserCircle },
  { key: "performance", label: "Performance", href: "/performance", icon: Target },
  { key: "directory", label: "Directory", href: "/directory", icon: Contact },
  { key: "maintenance", label: "Maintenance", href: "/maintenance", icon: Wrench },
  { key: "claims", label: "Claims", href: "/claims", icon: Receipt },
  { key: "buzz", label: "Buzz", href: "/buzz", icon: Megaphone }
];

function isActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  if (base.startsWith("/admin")) return pathname.startsWith("/admin");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        // sticky + self-start: pins to the viewport as the page
        // scrolls, rather than scrolling away with the content —
        // and its own height always spans the full viewport, so the
        // colored background reads as a continuous column no matter
        // how long the page content is.
        "sticky top-0 flex h-screen shrink-0 flex-col rounded-r-3xl bg-brand-gradient shadow-lg transition-all",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink shadow-md hover:opacity-90"
      >
        <ChevronLeft size={14} className={clsx("transition-transform", collapsed && "rotate-180")} />
      </button>

      <div className={clsx("flex items-center gap-2 px-5 py-5", collapsed && "justify-center px-0")}>
        <Image src="/vertexhrm-icon-white.svg" alt="" width={26} height={26} aria-hidden="true" />
        {!collapsed && <span className="font-display text-lg font-medium text-white">vertexhrm</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map(({ key, label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-white font-medium text-brand-700" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              {/* Icon sits in its own rounded tile rather than bare —
                  a small touch that reads as more deliberate/modern
                  than a plain inline glyph. */}
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  active ? "bg-brand-50" : "bg-white/10"
                )}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/15 px-5 py-4">
          <Link
            href="/ops/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-white hover:underline"
          >
            <ArrowLeftRight size={15} /> Admin Operations
          </Link>
          <p className="mt-2 text-xs text-white/50">Round Table Seychelles &middot; v0.1</p>
        </div>
      )}
    </aside>
  );
}

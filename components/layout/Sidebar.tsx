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
  ChevronLeft
} from "lucide-react";

// Flat, top-level only — matches the reference layout: no nested
// expansion in the sidebar itself. Each module's own sub-sections
// (Admin's User Management/Job/Organization/etc., PIM's Employee
// List/Add Employee/Configuration, etc.) live in a horizontal pill
// sub-nav at the top of that module's pages instead — see
// components/layout/SubNav.tsx.
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
  { key: "buzz", label: "Buzz", href: "/buzz", icon: Megaphone },
  { key: "documents", label: "Documents", href: "/documents", icon: FileText }
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
        "relative flex h-screen shrink-0 flex-col overflow-y-auto rounded-r-3xl border-r border-surface-border bg-white shadow-sm transition-all",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-white text-ink-soft shadow-sm hover:text-ink"
      >
        <ChevronLeft size={14} className={clsx("transition-transform", collapsed && "rotate-180")} />
      </button>

      <div className={clsx("flex items-center gap-2 px-5 py-5", collapsed && "justify-center px-0")}>
        <Image src="/vertexhrm-icon-gradient.svg" alt="" width={28} height={28} aria-hidden="true" />
        {!collapsed && <span className="font-display text-lg font-medium text-ink">vertexhrm</span>}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pb-4">
        {NAV.map(({ key, label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-brand-gradient font-medium text-white" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
              )}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-5 py-4 text-xs text-ink-soft">Round Table Seychelles &middot; v0.1</div>
      )}
    </aside>
  );
}

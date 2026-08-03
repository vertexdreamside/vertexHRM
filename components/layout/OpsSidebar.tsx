"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import {
  LayoutDashboard, FileText, Inbox, ClipboardList, ShoppingCart, Wrench, Package,
  Boxes, Wallet, CalendarDays, Megaphone, UserPlus, History, ShieldCheck, GitBranch, BarChart3,
  ArrowLeftRight, ChevronLeft, Layers
} from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/ops/dashboard", icon: LayoutDashboard },
  { key: "inbox", label: "Inbox", href: "/ops/inbox", icon: Inbox },
  { key: "requests", label: "Requests", href: "/ops/requests", icon: ClipboardList },
  { key: "procurement", label: "Procurement", href: "/ops/procurement", icon: ShoppingCart },
  { key: "it-support", label: "IT Support", href: "/ops/it-support", icon: Wrench },
  { key: "assets", label: "Assets", href: "/ops/assets", icon: Package },
  { key: "inventory", label: "Inventory", href: "/ops/inventory", icon: Boxes },
  { key: "expenses", label: "Expenses", href: "/ops/expenses", icon: Wallet },
  { key: "calendar", label: "Calendar", href: "/ops/calendar", icon: CalendarDays },
  { key: "communication", label: "Communication", href: "/ops/communication", icon: Megaphone },
  { key: "documents", label: "Documents", href: "/ops/documents", icon: FileText },
  { key: "onboarding", label: "Onboarding", href: "/ops/onboarding", icon: UserPlus },
  { key: "reports", label: "Reports", href: "/ops/reports", icon: BarChart3 },
  { key: "audit-trail", label: "Audit Trail", href: "/ops/audit-trail", icon: History },
  { key: "security", label: "Security", href: "/ops/security", icon: ShieldCheck },
  { key: "workflows", label: "Workflows", href: "/ops/workflows", icon: GitBranch }
];

export function OpsSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
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
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white">
          <Layers size={16} />
        </div>
        {!collapsed && <span className="font-display text-base font-medium text-white">Admin Operations</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ key, label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
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
              <span className={clsx("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", active ? "bg-brand-50" : "bg-white/10")}>
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              {!collapsed && label}
            </Link>
          );
        })}

        {!collapsed && (
          <p className="px-3 pt-3 text-xs text-white/50">
            Workflows (multi-step approval chains) is the only piece left un-built — everything else here is real.
          </p>
        )}
      </nav>

      <div className="border-t border-white/15 p-3">
        <Link
          href="/dashboard"
          title={collapsed ? "Back to Vertex HRM" : undefined}
          className={clsx(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white",
            collapsed && "justify-center px-0"
          )}
        >
          <ArrowLeftRight size={16} />
          {!collapsed && "Back to Vertex HRM"}
        </Link>
      </div>
    </aside>
  );
}

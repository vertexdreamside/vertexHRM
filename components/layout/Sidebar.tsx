"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  Search,
  X
} from "lucide-react";

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

const DESTINATIONS = NAV.map((n) => ({ label: n.label, href: n.href, icon: n.icon }));

function isActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  if (base.startsWith("/admin")) return pathname.startsWith("/admin");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function Sidebar({ disabledKeys = [] }: { disabledKeys?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const visibleNav = NAV.filter((n) => !disabledKeys.includes(n.key));

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return DESTINATIONS;
    const q = searchQuery.toLowerCase();
    return DESTINATIONS.filter((d) => d.label.toLowerCase().includes(q));
  }, [searchQuery]);

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
        className="absolute -right-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-ink-900 shadow-md ring-2 ring-white hover:brightness-105"
      >
        <ChevronLeft size={15} strokeWidth={2.5} className={clsx("text-ink transition-transform", collapsed && "rotate-180")} />
      </button>

      {/* Logo — gamified with a soft glowing ring and a hover pop,
          rather than sitting flat against the sidebar background. */}
      <div className={clsx("flex items-center gap-2 px-5 py-5", collapsed && "justify-center px-0")}>
        <div className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner transition-transform hover:scale-110 hover:rotate-3">
          <span className="absolute inset-0 rounded-xl bg-amber-400/30 blur-md" aria-hidden="true" />
          <Image src="/vertexhrm-icon-white.svg" alt="" width={20} height={20} aria-hidden="true" className="relative z-10" />
        </div>
        {!collapsed && <span className="font-display text-lg font-medium text-white">vertexhrm</span>}
      </div>

      {/* Search — moved here from the topbar, right under the logo. */}
      <div className={clsx("px-3 pb-3", collapsed && "px-2")}>
        <button
          onClick={() => setSearchOpen(true)}
          data-tour="sidebar-search"
          title={collapsed ? "Search (⌘K)" : undefined}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/15",
            collapsed && "justify-center px-0"
          )}
        >
          <Search size={15} aria-hidden="true" />
          {!collapsed && (
            <>
              <span>Search...</span>
              <kbd className="ml-auto rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/60">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav data-tour="sidebar-nav" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {visibleNav.map(({ key, label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-amber-400 font-medium text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110 group-hover:-rotate-3",
                  active ? "bg-white/40" : "bg-white/10"
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
            data-tour="sidebar-adminops"
            href="/ops/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-white hover:underline"
          >
            <ArrowLeftRight size={15} /> Admin Operations
          </Link>
          <p className="mt-2 text-xs text-white/50">Vertex HRM &middot; v0.1</p>
        </div>
      )}

      {searchOpen && (
        <div ref={searchRef} className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-card bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
              <Search size={18} className="text-ink-soft" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to a module or page..."
                className="w-full bg-transparent text-sm text-ink focus:outline-none"
              />
              <button onClick={() => setSearchOpen(false)} aria-label="Close search" className="rounded-md p-1 text-ink-soft hover:bg-surface-subtle">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {filteredDestinations.map((d) => (
                <button
                  key={d.href}
                  onClick={() => { router.push(d.href); setSearchOpen(false); setSearchQuery(""); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-subtle"
                >
                  <d.icon size={16} className="text-ink-soft" /> {d.label}
                </button>
              ))}
              {filteredDestinations.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-ink-soft">No matching page.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

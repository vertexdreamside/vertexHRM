"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  GraduationCap,
  CalendarDays,
  FileText,
  ShieldCheck
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organization", label: "Organization", icon: Building2 },
  { href: "/admin/job-section", label: "Job Section", icon: Briefcase },
  { href: "/admin/qualifications", label: "Qualifications", icon: GraduationCap },
  { href: "/leave", label: "Leave", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-surface-border bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image
          src="/vertexhrm-icon-gradient.svg"
          alt=""
          width={28}
          height={28}
          aria-hidden="true"
        />
        <span className="font-display text-lg font-medium text-ink">
          vertexhrm
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
              )}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-ink-soft">
        Round Table Seychelles &middot; v0.1
      </div>
    </aside>
  );
}

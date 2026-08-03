"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export interface SubNavItem {
  label: string;
  href: string;
}

// Flat pill row, no dropdown — clicking a pill navigates to that
// section's own page, which shows ITS sub-sections as its own
// internal tab row (Job Section, Organization, Qualifications, and
// PIM Configuration all already work this way). Sub-navigation lives
// on the destination page, not in a menu layered on top of it.
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-1.5 border-b border-surface-border pb-4">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

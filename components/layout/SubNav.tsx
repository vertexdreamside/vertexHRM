"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

export interface SubNavItem {
  label: string;
  href: string;
  dropdown?: { label: string; href: string }[];
}

// Horizontal pill sub-navigation with optional dropdowns — sits at the
// top of a module's content, one level below the main sidebar. Pills
// without a dropdown link directly; pills with one open a small menu
// of the module's sub-sections, matching the reference layout's
// Admin/PIM pattern (User Management ▾, Job ▾, Organization ▾, etc.)
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function isActive(href: string) {
    const [base, query] = href.split("?");
    if (pathname !== base) return false;
    if (!query) return true;
    const targetTab = new URLSearchParams(query).get("tab");
    const currentTab = searchParams.get("tab");
    return targetTab === (currentTab ?? "general") || targetTab === currentTab;
  }

  return (
    <div ref={ref} className="mb-6 flex flex-wrap gap-1.5 border-b border-surface-border pb-4">
      {items.map((item) => {
        const active = item.dropdown
          ? item.dropdown.some((d) => isActive(d.href)) || pathname === item.href.split("?")[0]
          : isActive(item.href);

        if (!item.dropdown) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <div key={item.label} className="relative">
            <button
              onClick={() => setOpenKey((k) => (k === item.label ? null : item.label))}
              className={clsx(
                "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              {item.label}
              <ChevronDown size={14} className={clsx("transition-transform", openKey === item.label && "rotate-180")} />
            </button>
            {openKey === item.label && (
              <div className="absolute left-0 z-20 mt-1.5 w-52 rounded-card border border-surface-border bg-white py-1.5 shadow-lg">
                {item.dropdown.map((d) => (
                  <Link
                    key={d.href}
                    href={d.href}
                    onClick={() => setOpenKey(null)}
                    className={clsx(
                      "block px-4 py-2 text-sm hover:bg-surface-subtle",
                      isActive(d.href) ? "font-medium text-brand-700" : "text-ink-muted"
                    )}
                  >
                    {d.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

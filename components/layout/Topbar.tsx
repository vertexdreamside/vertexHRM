"use client";

import { Bell, Search } from "lucide-react";

export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-6">
      <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-surface-border bg-surface-subtle px-3 py-2">
        <Search size={16} className="text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search employees, requests, documents..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-full p-2 text-ink-muted hover:bg-surface-subtle"
        >
          <Bell size={18} aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-state-danger" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-medium text-white">
            {userName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="text-sm font-medium text-ink">{userName}</span>
        </div>
      </div>
    </header>
  );
}

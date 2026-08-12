"use client";

import { useEffect, useState } from "react";
import { FileText, RefreshCw, Plus, CheckCircle2, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const TYPE_STYLES: Record<string, string> = {
  Major: "bg-state-dangerBg text-state-danger",
  Minor: "bg-brand-50 text-brand-700",
  Patch: "bg-surface-subtle text-ink-soft"
};

interface ChangelogEntry {
  id: string;
  version: string;
  release_date: string;
  change_type: string;
  is_current: boolean;
  items: string[];
}

export default function ChangelogPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<string[]>([""]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("changelog_entries").select("id, version, release_date, change_type, is_current, items").order("release_date", { ascending: false });
    setEntries((data as ChangelogEntry[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function openAdd() {
    setItems([""]);
    setAdding(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const cleanItems = items.map((i) => i.trim()).filter(Boolean);
    const isCurrent = form.get("isCurrent") === "on";

    // Only one release can be "current" — clear the flag on whichever
    // one currently holds it before setting the new one, so the badge
    // never ends up on two entries at once.
    if (isCurrent) {
      await supabase.from("changelog_entries").update({ is_current: false }).eq("is_current", true);
    }

    const { error } = await supabase.from("changelog_entries").insert({
      version: form.get("version"),
      release_date: form.get("releaseDate"),
      change_type: form.get("changeType"),
      is_current: isCurrent,
      items: cleanItems
    });
    setSaving(false);
    if (error) {
      alert(error.message.includes("duplicate") ? `Version "${form.get("version")}" already exists.` : error.message);
      return;
    }
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">System Changelog</h1>
          <p className="mt-1 text-sm text-ink-muted">All notable changes across release versions, persisted to the changelog_entries table.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle disabled:opacity-50">
            <RefreshCw size={14} className={clsx(loading && "animate-spin")} /> Refresh
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus size={14} /> Add Entry
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className={clsx("rounded-card border bg-white p-5", e.is_current ? "border-state-success/40" : "border-surface-border")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-700">{e.version}</span>
                  {e.is_current && <span className="rounded-full bg-state-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Current</span>}
                  <span className="text-sm text-ink-soft">{new Date(e.release_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <span className={clsx("rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TYPE_STYLES[e.change_type])}>{e.change_type}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {e.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-muted">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-state-success" />
                    {item}
                  </li>
                ))}
                {e.items.length === 0 && <li className="text-sm text-ink-soft">No items listed.</li>}
              </ul>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-card border border-surface-border bg-white p-10 text-center">
              <FileText size={22} className="text-ink-soft" />
              <p className="text-sm text-ink-soft">No changelog entries yet.</p>
            </div>
          )}
        </div>
      )}

      {adding && (
        <Modal title="Add changelog entry" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Version *</label><input name="version" required placeholder="v0.2" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Release Date *</label><input name="releaseDate" type="date" required className={inputCls} /></div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Change Type *</label>
              <select name="changeType" required defaultValue="Minor" className={inputCls}>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
                <option value="Patch">Patch</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="isCurrent" /> Mark as current release</label>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Changes</label>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={item}
                      onChange={(e) => setItems((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                      placeholder="Describe a change..."
                      className={inputCls}
                    />
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 text-ink-soft hover:text-state-danger">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setItems((prev) => [...prev, ""])} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
                <Plus size={12} /> Add another line
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

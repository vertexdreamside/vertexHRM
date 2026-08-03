"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

interface EventRow { id: string; title: string; description: string | null; start_at: string; end_at: string; all_day: boolean }

export default function CalendarPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("calendar_events").select("id, title, description, start_at, end_at, all_day").order("start_at");
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("calendar_events").insert({
      title: form.get("title"), description: form.get("description"),
      // datetime-local inputs give a bare string with no timezone
      // offset (e.g. "2026-08-15T09:00") — passed straight to a
      // timestamptz column, Postgres would interpret it in the
      // database's timezone, not the browser's, silently shifting the
      // displayed time. `new Date(...)` parses it as local time in the
      // browser first, then `.toISOString()` converts that correctly.
      start_at: new Date(String(form.get("start"))).toISOString(),
      end_at: new Date(String(form.get("end"))).toISOString(),
      created_by: user?.id
    });
    setSaving(false); setAdding(false); load();
  }

  const upcoming = events.filter((e) => new Date(e.end_at) >= new Date());

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Calendar</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Shared organization events — live from Supabase. List view of upcoming events, not a full month/week grid yet.
      </p>

      <div className="mt-6 mb-3 flex justify-end"><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add event</button></div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-card border border-surface-border bg-white p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><CalendarDays size={16} /></span>
              <div>
                <p className="font-medium text-ink">{e.title}</p>
                <p className="text-xs text-ink-soft">
                  {e.all_day
                    ? new Date(e.start_at).toLocaleDateString()
                    : `${new Date(e.start_at).toLocaleString()} — ${new Date(e.end_at).toLocaleString()}`}
                </p>
                {e.description && <p className="mt-1 text-sm text-ink-muted">{e.description}</p>}
              </div>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">No upcoming events.</p>}
        </div>
      )}

      {adding && (
        <Modal title="Add event" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Title *</label><input name="title" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description</label><textarea name="description" rows={2} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Start *</label><input name="start" type="datetime-local" required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">End *</label><input name="end" type="datetime-local" required className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Megaphone, Plus, Pin, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

interface AnnouncementRow { id: string; title: string; body: string; created_at: string; pinned: boolean }

export default function CommunicationPage() {
  const supabase = createClient();
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("id, title, body, created_at, pinned").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setItems((data as AnnouncementRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("announcements").insert({ title: form.get("title"), body: form.get("body"), created_by: user?.id, pinned: form.get("pinned") === "on" });
    setSaving(false); setAdding(false); load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Communication</h1>
      <p className="mt-1 text-sm text-ink-muted">Formal organization-wide announcements — distinct from HRM &rarr; Buzz&apos;s social feed.</p>

      <div className="mt-6 mb-3 flex justify-end"><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> New announcement</button></div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-card border border-surface-border bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Megaphone size={15} /></span>
                <p className="font-medium text-ink">{a.title}</p>
                {a.pinned && <Pin size={13} className="text-state-warning" />}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{a.body}</p>
              <p className="mt-2 text-xs text-ink-soft">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {items.length === 0 && <p className={clsx("py-10 text-center text-sm text-ink-soft")}>No announcements yet.</p>}
        </div>
      )}

      {adding && (
        <Modal title="New announcement" onClose={() => setAdding(false)}>
          <form onSubmit={save} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Title *</label><input name="title" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Message *</label><textarea name="body" required rows={4} className={inputCls} /></div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="pinned" /> Pin to top</label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Post</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

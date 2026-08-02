"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Download, History, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

interface CategoryRow { id: string; name: string }
interface DocumentRow {
  id: string; name: string; category_id: string | null; version: number; expiry_date: string | null;
  notes: string | null; storage_path: string; created_at: string; updated_at: string;
  document_categories: { name: string } | { name: string }[] | null;
  app_users: { username: string } | { username: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default function DocumentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reuploadTarget, setReuploadTarget] = useState<DocumentRow | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);

    const [catRes, docRes] = await Promise.all([
      supabase.from("document_categories").select("id, name").order("name"),
      supabase.from("documents").select("id, name, category_id, version, expiry_date, notes, storage_path, created_at, updated_at, document_categories(name), app_users(username)").order("updated_at", { ascending: false })
    ]);
    setCategories((catRes.data as CategoryRow[]) ?? []);
    setDocuments((docRes.data as unknown as DocumentRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = categoryFilter ? documents.filter((d) => d.category_id === categoryFilter) : documents;

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) {
      alert("Choose a file.");
      return;
    }
    if (!myUserId) {
      alert("Your login isn't linked to a user account.");
      return;
    }
    setSaving(true);
    const path = `docs/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setSaving(false);
      alert(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: doc, error: insertError } = await supabase.from("documents").insert({
      name: form.get("name") || file.name,
      category_id: form.get("categoryId") || null,
      owner_id: myUserId,
      storage_path: path,
      expiry_date: form.get("expiryDate") || null,
      notes: form.get("notes")
    }).select("id").single();

    if (!insertError && doc) {
      await supabase.from("document_versions").insert({ document_id: doc.id, storage_path: path, version_number: 1, uploaded_by: myUserId });
    }

    setSaving(false);
    if (insertError) {
      alert(insertError.message);
      return;
    }
    setUploading(false);
    load();
  }

  async function reupload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reuploadTarget || !myUserId) return;
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) return;

    setSaving(true);
    const path = `docs/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setSaving(false);
      alert(`Upload failed: ${uploadError.message}`);
      return;
    }

    const newVersion = reuploadTarget.version + 1;
    await supabase.from("documents").update({ storage_path: path, version: newVersion, updated_at: new Date().toISOString() }).eq("id", reuploadTarget.id);
    await supabase.from("document_versions").insert({ document_id: reuploadTarget.id, storage_path: path, version_number: newVersion, uploaded_by: myUserId });

    setSaving(false);
    setReuploadTarget(null);
    load();
  }

  async function download(doc: DocumentRow) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      alert("Couldn't generate a download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(id: string) {
    if (!confirm("Delete this document? Version history will be removed too.")) return;
    await supabase.from("documents").delete().eq("id", id);
    load();
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Documents</h1>
          <p className="mt-1 text-sm text-ink-muted">Store, organize, and version company documents — live from Supabase.</p>
        </div>
        <button onClick={() => setUploading(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Upload document</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter("")} className={clsx("rounded-full px-3 py-1 text-xs font-medium", !categoryFilter ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted")}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={clsx("rounded-full px-3 py-1 text-xs font-medium", categoryFilter === c.id ? "bg-brand-gradient text-white" : "bg-surface-subtle text-ink-muted")}>{c.name}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Last modified</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((doc) => {
              const expiringSoon = doc.expiry_date && daysUntil(doc.expiry_date) <= 30 && daysUntil(doc.expiry_date) >= 0;
              const expired = doc.expiry_date && daysUntil(doc.expiry_date) < 0;
              return (
                <tr key={doc.id} className="border-t border-surface-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-ink-soft" />
                      <span className="font-medium text-ink">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{one(doc.document_categories)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">v{doc.version}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {doc.expiry_date ? (
                      <span className={clsx("flex items-center gap-1 text-xs font-medium", expired ? "text-state-danger" : expiringSoon ? "text-state-warning" : "text-ink-muted")}>
                        {(expired || expiringSoon) && <AlertTriangle size={12} />} {doc.expiry_date}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => download(doc)} aria-label={`Download ${doc.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Download size={16} /></button>
                      <button onClick={() => setReuploadTarget(doc)} aria-label={`New version of ${doc.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><History size={16} /></button>
                      <button onClick={() => remove(doc.id)} aria-label={`Delete ${doc.name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No documents here yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        Documents past-due or expiring within 30 days are flagged inline — a real reminder email/notification (per the original
        spec) would need a scheduled job, which isn&apos;t wired yet; this is the in-app equivalent for now.
      </p>

      {uploading && (
        <Modal title="Upload document" onClose={() => setUploading(false)}>
          <form onSubmit={upload} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">File *</label>
              <input name="file" type="file" required className="w-full text-sm" />
              <p className="mt-1 text-xs text-ink-soft">Up to 10MB.</p>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Name (defaults to filename)</label><input name="name" className={inputCls} /></div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Category</label>
              <select name="categoryId" className={inputCls}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Expiry / renewal date</label><input name="expiryDate" type="date" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Notes</label><textarea name="notes" rows={2} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setUploading(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Upload</button>
            </div>
          </form>
        </Modal>
      )}

      {reuploadTarget && (
        <Modal title={`New version of ${reuploadTarget.name}`} onClose={() => setReuploadTarget(null)}>
          <form onSubmit={reupload} className="space-y-4">
            <p className="text-sm text-ink-muted">Currently v{reuploadTarget.version} — this becomes v{reuploadTarget.version + 1}. The previous version stays available in history.</p>
            <div><label className="mb-1 block text-sm font-medium text-ink">New file *</label><input name="file" type="file" required className="w-full text-sm" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReuploadTarget(null)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Upload new version</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Users2, Plus, Upload, Trash2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

const STAGES = ["Application Received", "Screening", "Interview Scheduled", "Interviewed", "Offer Extended", "Hired", "Rejected"];

const stageStyles: Record<string, string> = {
  "Application Received": "bg-surface-subtle text-ink-soft",
  Screening: "bg-brand-50 text-brand-700",
  "Interview Scheduled": "bg-state-warningBg text-state-warning",
  Interviewed: "bg-state-warningBg text-state-warning",
  "Offer Extended": "bg-brand-50 text-brand-700",
  Hired: "bg-state-successBg text-state-success",
  Rejected: "bg-state-dangerBg text-state-danger"
};

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const TABS = [
  { key: "vacancies", label: "Vacancies", icon: Briefcase },
  { key: "candidates", label: "Candidates", icon: Users2 }
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface VacancyRow { id: string; vacancy_name: string; job_title: string; number_of_positions: number; hiring_manager: string | null; status: string }
interface CandidateRow { id: string; full_name: string; email: string; vacancy_id: string | null; stage: string; applied_date: string; resume_document_id: string | null }

function RecruitmentPageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>((searchParams.get("tab") as TabKey) || "vacancies");

  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [addingVacancy, setAddingVacancy] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  async function load() {
    setLoading(true);
    const [vacRes, candRes] = await Promise.all([
      supabase.from("vacancies").select("id, vacancy_name, job_title, number_of_positions, hiring_manager, status").order("vacancy_name"),
      supabase.from("candidates").select("id, full_name, email, vacancy_id, stage, applied_date, resume_document_id").order("applied_date", { ascending: false })
    ]);
    setVacancies((vacRes.data as VacancyRow[]) ?? []);
    setCandidates((candRes.data as CandidateRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function saveVacancy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("vacancies").insert({
      vacancy_name: form.get("vacancyName"),
      job_title: form.get("jobTitle"),
      number_of_positions: Number(form.get("numberOfPositions")),
      hiring_manager: form.get("hiringManager"),
      status: "Open"
    });
    setSaving(false);
    setAddingVacancy(false);
    load();
  }

  async function toggleVacancyStatus(id: string, status: string) {
    await supabase.from("vacancies").update({ status: status === "Open" ? "Closed" : "Open" }).eq("id", id);
    load();
  }

  async function saveCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("resume") as File | null;

    // Resumes now go through Documents (Admin Ops §2) properly — a
    // real documents row under the "Recruitment" category, not a bare
    // Storage path string like before. Uses the shared "documents"
    // bucket rather than the earlier "recruitment" bucket, so every
    // file in the platform is findable through one place.
    let resumeDocumentId: string | null = null;
    if (file && file.size > 0) {
      setUploadingResume(true);
      const { data: { user } } = await supabase.auth.getUser();
      const path = `docs/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        setUploadingResume(false);
        setSaving(false);
        alert(`Resume upload failed: ${uploadError.message}`);
        return;
      }
      const { data: category } = await supabase.from("document_categories").select("id").eq("name", "Recruitment").single();
      const { data: doc } = await supabase.from("documents").insert({
        name: file.name,
        category_id: category?.id ?? null,
        owner_id: user?.id ?? null,
        storage_path: path,
        notes: `Resume — ${form.get("fullName")}`
      }).select("id").single();
      if (doc) {
        await supabase.from("document_versions").insert({ document_id: doc.id, storage_path: path, version_number: 1, uploaded_by: user?.id });
        resumeDocumentId = doc.id;
      }
      setUploadingResume(false);
    }

    await supabase.from("candidates").insert({
      full_name: form.get("fullName"),
      email: form.get("email"),
      vacancy_id: form.get("vacancyId") || null,
      stage: "Application Received",
      resume_document_id: resumeDocumentId
    });
    setSaving(false);
    setAddingCandidate(false);
    load();
  }

  async function moveStage(id: string, stage: string) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    await supabase.from("candidates").update({ stage }).eq("id", id);
  }

  async function removeCandidate(id: string) {
    if (!confirm("Remove this candidate?")) return;
    await supabase.from("candidates").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Recruitment</h1>
      <p className="mt-1 text-sm text-ink-muted">Open vacancies and the candidate pipeline — live from Supabase.</p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={clsx("flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="mt-6">
          {activeTab === "vacancies" && (
            <div>
              <div className="mb-3 flex justify-end">
                <button onClick={() => setAddingVacancy(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add vacancy</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Vacancy</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Positions</th><th className="px-4 py-3">Hiring manager</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {vacancies.map((v) => (
                      <tr key={v.id} className="border-t border-surface-border">
                        <td className="px-4 py-3 font-medium text-ink">{v.vacancy_name}</td>
                        <td className="px-4 py-3 text-ink-muted">{v.job_title}</td>
                        <td className="px-4 py-3 text-ink-muted">{v.number_of_positions}</td>
                        <td className="px-4 py-3 text-ink-muted">{v.hiring_manager}</td>
                        <td className="px-4 py-3"><span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", v.status === "Open" ? "bg-state-successBg text-state-success" : "bg-surface-subtle text-ink-soft")}>{v.status}</span></td>
                        <td className="px-4 py-3 text-right"><button onClick={() => toggleVacancyStatus(v.id, v.status)} className="text-xs font-medium text-brand-700 hover:underline">{v.status === "Open" ? "Close" : "Reopen"}</button></td>
                      </tr>
                    ))}
                    {vacancies.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No vacancies yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "candidates" && (
            <div>
              <div className="mb-3 flex justify-end">
                <button onClick={() => setAddingCandidate(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add candidate</button>
              </div>
              <div className="overflow-hidden rounded-card border border-surface-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Vacancy</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Resume</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.id} className="border-t border-surface-border">
                        <td className="px-4 py-3"><p className="font-medium text-ink">{c.full_name}</p><p className="text-xs text-ink-soft">{c.email}</p></td>
                        <td className="px-4 py-3 text-ink-muted">{vacancies.find((v) => v.id === c.vacancy_id)?.vacancy_name ?? "—"}</td>
                        <td className="px-4 py-3 text-ink-muted">{c.applied_date}</td>
                        <td className="px-4 py-3 text-ink-muted">{c.resume_document_id ? "Uploaded" : "—"}</td>
                        <td className="px-4 py-3">
                          <select value={c.stage} onChange={(e) => moveStage(c.id, e.target.value)} className={clsx("rounded-full border-0 px-2.5 py-0.5 text-xs font-medium", stageStyles[c.stage])}>
                            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right"><button onClick={() => removeCandidate(c.id)} aria-label={`Remove ${c.full_name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                    {candidates.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No candidates yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {addingVacancy && (
        <Modal title="Add vacancy" onClose={() => setAddingVacancy(false)}>
          <form onSubmit={saveVacancy} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Vacancy name *</label><input name="vacancyName" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Job title *</label><input name="jobTitle" required className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium text-ink">Number of positions *</label><input name="numberOfPositions" type="number" min={1} defaultValue={1} required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Hiring manager</label><input name="hiringManager" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingVacancy(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingCandidate && (
        <Modal title="Add candidate" onClose={() => setAddingCandidate(false)}>
          <form onSubmit={saveCandidate} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Full name *</label><input name="fullName" required className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium text-ink">Email *</label><input name="email" type="email" required className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Phone</label><input name="phone" className={inputCls} /></div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Applying for *</label>
              <select name="vacancyId" required className={inputCls}>{vacancies.filter((v) => v.status === "Open").map((v) => <option key={v.id} value={v.id}>{v.vacancy_name}</option>)}</select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Resume</label>
              <div className="flex items-center gap-2">
                <label htmlFor="resume" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"><Upload size={14} /> Browse</label>
                <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="hidden" />
                {uploadingResume && <Loader2 size={16} className="animate-spin text-ink-soft" />}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingCandidate(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function RecruitmentPage() {
  return (
    <Suspense fallback={null}>
      <RecruitmentPageInner />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Users2, Plus, Upload, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { Vacancy, Candidate, CandidateStage } from "@/lib/types";

const SEED_VACANCIES: Vacancy[] = [
  { id: "1", jobTitle: "Accountant", vacancyName: "Junior Accountant — Finance", numberOfPositions: 1, hiringManager: "Aurelie Confait", status: "Open" },
  { id: "2", jobTitle: "IT Officer", vacancyName: "IT Support Technician", numberOfPositions: 1, hiringManager: "Selvan Pillay", status: "Open" }
];

const SEED_CANDIDATES: Candidate[] = [
  { id: "1", fullName: "Nadia Hoareau", email: "n.hoareau@example.com", phone: "+248 2 5xx xxx", vacancyId: "1", stage: "Screening", appliedDate: "2026-07-20", resumeFileName: "nadia_hoareau_cv.pdf" },
  { id: "2", fullName: "Kevin Rassool", email: "k.rassool@example.com", phone: "+248 2 5xx xxx", vacancyId: "2", stage: "Interview Scheduled", appliedDate: "2026-07-25", resumeFileName: "kevin_rassool_cv.pdf" }
];

const STAGES: CandidateStage[] = [
  "Application Received", "Screening", "Interview Scheduled", "Interviewed", "Offer Extended", "Hired", "Rejected"
];

const stageStyles: Record<CandidateStage, string> = {
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

function RecruitmentPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) || "vacancies"
  );
  const [vacancies, setVacancies] = useState<Vacancy[]>(SEED_VACANCIES);
  const [candidates, setCandidates] = useState<Candidate[]>(SEED_CANDIDATES);
  const [addingVacancy, setAddingVacancy] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);

  function saveVacancy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setVacancies((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        jobTitle: String(form.get("jobTitle")),
        vacancyName: String(form.get("vacancyName")),
        numberOfPositions: Number(form.get("numberOfPositions")),
        hiringManager: String(form.get("hiringManager")),
        status: "Open"
      }
    ]);
    // TODO(supabase): insert into `vacancies`
    setAddingVacancy(false);
  }

  function toggleVacancyStatus(id: string) {
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: v.status === "Open" ? "Closed" : "Open" } : v))
    );
  }

  function saveCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("resume") as File | null;
    setCandidates((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        fullName: String(form.get("fullName")),
        email: String(form.get("email")),
        phone: String(form.get("phone")),
        vacancyId: String(form.get("vacancyId")),
        stage: "Application Received",
        appliedDate: new Date().toISOString().slice(0, 10),
        resumeFileName: file && file.size > 0 ? file.name : null
      }
    ]);
    // TODO(supabase): insert into `candidates`; upload resume to Storage
    // bucket `recruitment` and store the resulting document reference.
    setAddingCandidate(false);
  }

  function moveStage(id: string, stage: CandidateStage) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
  }

  function removeCandidate(id: string) {
    if (!confirm("Remove this candidate?")) return;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Recruitment</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Open vacancies and the candidate pipeline.
      </p>

      <div className="mt-6 flex gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "vacancies" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingVacancy(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Add vacancy
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Vacancy</th>
                    <th className="px-4 py-3">Job title</th>
                    <th className="px-4 py-3">Positions</th>
                    <th className="px-4 py-3">Hiring manager</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vacancies.map((v) => (
                    <tr key={v.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{v.vacancyName}</td>
                      <td className="px-4 py-3 text-ink-muted">{v.jobTitle}</td>
                      <td className="px-4 py-3 text-ink-muted">{v.numberOfPositions}</td>
                      <td className="px-4 py-3 text-ink-muted">{v.hiringManager}</td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            v.status === "Open" ? "bg-state-successBg text-state-success" : "bg-surface-subtle text-ink-soft"
                          )}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleVacancyStatus(v.id)}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          {v.status === "Open" ? "Close" : "Reopen"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "candidates" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingCandidate(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Add candidate
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Vacancy</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3">Resume</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-t border-surface-border">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{c.fullName}</p>
                        <p className="text-xs text-ink-soft">{c.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {vacancies.find((v) => v.id === c.vacancyId)?.vacancyName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{c.appliedDate}</td>
                      <td className="px-4 py-3 text-ink-muted">{c.resumeFileName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={c.stage}
                          onChange={(e) => moveStage(c.id, e.target.value as CandidateStage)}
                          className={clsx(
                            "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                            stageStyles[c.stage]
                          )}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeCandidate(c.id)}
                          aria-label={`Remove ${c.fullName}`}
                          className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {candidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">
                        No candidates yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {addingVacancy && (
        <Modal title="Add vacancy" onClose={() => setAddingVacancy(false)}>
          <form onSubmit={saveVacancy} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Vacancy name *</label>
              <input name="vacancyName" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Job title *</label>
              <input name="jobTitle" required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Number of positions *</label>
                <input name="numberOfPositions" type="number" min={1} defaultValue={1} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Hiring manager</label>
                <input name="hiringManager" className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingVacancy(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingCandidate && (
        <Modal title="Add candidate" onClose={() => setAddingCandidate(false)}>
          <form onSubmit={saveCandidate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Full name *</label>
              <input name="fullName" required className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Email *</label>
                <input name="email" type="email" required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Phone</label>
                <input name="phone" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Applying for *</label>
              <select name="vacancyId" required className={inputCls}>
                {vacancies.filter((v) => v.status === "Open").map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vacancyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Resume</label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="resume"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
                >
                  <Upload size={14} /> Browse
                </label>
                <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" className="hidden" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingCandidate(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
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

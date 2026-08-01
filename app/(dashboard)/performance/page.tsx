"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Target, ClipboardList, Plus, Star, TrendingUp, Users2, Wallet, FileSignature } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type { PerformanceKpi, PerformanceReview, ReviewStatus } from "@/lib/types";

const SEED_KPIS: PerformanceKpi[] = [
  { id: "1", jobTitle: "Accountant", kpiName: "Timeliness of monthly close", weight: 30 },
  { id: "2", jobTitle: "Accountant", kpiName: "Accuracy of reconciliations", weight: 30 },
  { id: "3", jobTitle: "IT Officer", kpiName: "Ticket resolution time", weight: 40 }
];

const SEED_REVIEWS: PerformanceReview[] = [
  { id: "1", employeeName: "Marie Dubel", reviewer: "Jules Esparon", reviewPeriod: "H1 2026", status: "Completed", overallRating: 4 },
  { id: "2", employeeName: "Selvan Pillay", reviewer: "Jules Esparon", reviewPeriod: "H1 2026", status: "In Progress", overallRating: null }
];

const statusStyles: Record<ReviewStatus, string> = {
  Draft: "bg-surface-subtle text-ink-soft",
  "In Progress": "bg-state-warningBg text-state-warning",
  Completed: "bg-state-successBg text-state-success"
};

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-ink-soft">Not yet rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? "fill-brand-500 text-brand-500" : "text-surface-border"}
        />
      ))}
    </div>
  );
}

const TABS = [
  { key: "reviews", label: "Manage Reviews", icon: ClipboardList },
  { key: "kpis", label: "Configure", icon: Target },
  { key: "mytrackers", label: "My Trackers", icon: TrendingUp },
  { key: "employeetrackers", label: "Employee Trackers", icon: Users2 },
  { key: "thirteenthmonth", label: "13th Month Salary", icon: Wallet },
  { key: "appraisal", label: "Appraisal", icon: FileSignature }
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface Tracker {
  id: string;
  employeeName: string;
  goal: string;
  progress: number; // 0-100
}

const SEED_MY_TRACKERS: Tracker[] = [
  { id: "1", employeeName: "You", goal: "Launch the NIHSS room booking site", progress: 70 },
  { id: "2", employeeName: "You", goal: "Complete Supabase migration training", progress: 30 }
];

const SEED_EMPLOYEE_TRACKERS: Tracker[] = [
  { id: "1", employeeName: "Selvan Pillay", goal: "Reduce average ticket resolution time", progress: 55 }
];

// Eligibility per the Employment Act: Seychellois nationals only,
// excludes foreign workers/trainees/probation, capped at SCR 45,450 —
// see conversation notes; verify current thresholds before relying on
// this for an actual payroll run.
interface ThirteenthMonthRow {
  id: string;
  employeeName: string;
  nationality: string;
  monthlySalary: number;
  eligible: boolean;
  amount: number;
  status: "Pending" | "Paid";
}

const THIRTEENTH_MONTH_CAP = 45450;

const SEED_THIRTEENTH_MONTH: ThirteenthMonthRow[] = [
  { id: "1", employeeName: "Jules Esparon", nationality: "Seychellois", monthlySalary: 28000, eligible: true, amount: 28000, status: "Pending" },
  { id: "2", employeeName: "Marie Dubel", nationality: "Seychellois", monthlySalary: 52000, eligible: true, amount: THIRTEENTH_MONTH_CAP, status: "Pending" },
  { id: "3", employeeName: "Selvan Pillay", nationality: "Seychellois", monthlySalary: 24000, eligible: true, amount: 24000, status: "Paid" }
];

function PerformancePageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get("tab") as TabKey) || "reviews"
  );
  const [reviews, setReviews] = useState<PerformanceReview[]>(SEED_REVIEWS);
  const [kpis, setKpis] = useState<PerformanceKpi[]>(SEED_KPIS);
  const [addingReview, setAddingReview] = useState(false);
  const [addingKpi, setAddingKpi] = useState(false);
  const [myTrackers, setMyTrackers] = useState<Tracker[]>(SEED_MY_TRACKERS);
  const [employeeTrackers, setEmployeeTrackers] = useState<Tracker[]>(SEED_EMPLOYEE_TRACKERS);
  const [thirteenthMonth, setThirteenthMonth] = useState<ThirteenthMonthRow[]>(SEED_THIRTEENTH_MONTH);

  function saveReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setReviews((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        employeeName: String(form.get("employeeName")),
        reviewer: String(form.get("reviewer")),
        reviewPeriod: String(form.get("reviewPeriod")),
        status: "Draft",
        overallRating: null
      }
    ]);
    // TODO(supabase): insert into `performance_reviews`
    setAddingReview(false);
  }

  function updateReview(id: string, changes: Partial<PerformanceReview>) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  function saveKpi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setKpis((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        jobTitle: String(form.get("jobTitle")),
        kpiName: String(form.get("kpiName")),
        weight: Number(form.get("weight"))
      }
    ]);
    setAddingKpi(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Performance</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Review cycles and the KPI catalog they&apos;re scored against.
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
        {activeTab === "reviews" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingReview(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Start review
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Overall rating</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{r.employeeName}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.reviewer}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.reviewPeriod}</td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => {
                            const status = e.target.value as ReviewStatus;
                            updateReview(r.id, {
                              status,
                              overallRating: status === "Completed" ? r.overallRating ?? 3 : r.overallRating
                            });
                          }}
                          className={clsx(
                            "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                            statusStyles[r.status]
                          )}
                        >
                          <option value="Draft">Draft</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "Completed" ? (
                          <select
                            value={r.overallRating ?? 3}
                            onChange={(e) => updateReview(r.id, { overallRating: Number(e.target.value) })}
                            className="rounded-md border border-surface-border px-2 py-1 text-sm"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        ) : (
                          <StarRating value={r.overallRating} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "kpis" && (
          <div>
            <p className="mb-3 max-w-2xl text-sm text-ink-muted">
              KPIs are grouped by job title — weights within a job title
              are meant to add to 100%, though nothing enforces that yet.
            </p>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setAddingKpi(true)}
                className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={16} /> Add KPI
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Job title</th>
                    <th className="px-4 py-3">KPI</th>
                    <th className="px-4 py-3">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map((k) => (
                    <tr key={k.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{k.jobTitle}</td>
                      <td className="px-4 py-3 text-ink-muted">{k.kpiName}</td>
                      <td className="px-4 py-3 text-ink-muted">{k.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === "mytrackers" || activeTab === "employeetrackers") && (
          <TrackerList
            trackers={activeTab === "mytrackers" ? myTrackers : employeeTrackers}
            onUpdate={(id, progress) => {
              const setter = activeTab === "mytrackers" ? setMyTrackers : setEmployeeTrackers;
              setter((prev) => prev.map((t) => (t.id === id ? { ...t, progress } : t)));
            }}
            editableProgress={activeTab === "mytrackers"}
          />
        )}

        {activeTab === "thirteenthmonth" && (
          <div>
            <p className="mb-3 max-w-2xl text-sm text-ink-muted">
              Statutory in Seychelles — Seychellois nationals only (excludes
              foreign workers, trainees, and probation), capped and
              tax-exempt up to SCR {THIRTEENTH_MONTH_CAP.toLocaleString()},
              due by 31 January. Verify current thresholds before an
              actual payroll run — this figure has changed by government
              circular before.
            </p>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Nationality</th>
                    <th className="px-4 py-3">Monthly salary</th>
                    <th className="px-4 py-3">Amount due</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {thirteenthMonth.map((r) => (
                    <tr key={r.id} className="border-t border-surface-border">
                      <td className="px-4 py-3 font-medium text-ink">{r.employeeName}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.nationality}</td>
                      <td className="px-4 py-3 text-ink-muted">SCR {r.monthlySalary.toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink-muted">SCR {r.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setThirteenthMonth((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, status: x.status === "Paid" ? "Pending" : "Paid" } : x))
                            )
                          }
                          className={clsx(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            r.status === "Paid" ? "bg-state-successBg text-state-success" : "bg-state-warningBg text-state-warning"
                          )}
                        >
                          {r.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "appraisal" && (
          <div className="max-w-2xl space-y-4 rounded-card border border-surface-border bg-white p-6">
            <p className="text-sm text-ink-muted">
              Self-appraisal — a short written reflection to attach to
              your next review cycle.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Key achievements this period</label>
              <textarea rows={3} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Areas to improve</label>
              <textarea rows={3} className="w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500" />
            </div>
            <button className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Save draft
            </button>
          </div>
        )}
      </div>

      {addingReview && (
        <Modal title="Start review" onClose={() => setAddingReview(false)}>
          <form onSubmit={saveReview} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Employee *</label>
              <input name="employeeName" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Reviewer *</label>
              <input name="reviewer" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Review period *</label>
              <input name="reviewPeriod" required placeholder="e.g. H2 2026" className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingReview(false)}
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

      {addingKpi && (
        <Modal title="Add KPI" onClose={() => setAddingKpi(false)}>
          <form onSubmit={saveKpi} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Job title *</label>
              <input name="jobTitle" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">KPI name *</label>
              <input name="kpiName" required className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Weight (%) *</label>
              <input name="weight" type="number" min={1} max={100} required className={inputCls} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddingKpi(false)}
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

interface TrackerRow {
  id: string;
  employeeName: string;
  goal: string;
  progress: number;
}

function TrackerList({
  trackers,
  onUpdate,
  editableProgress
}: {
  trackers: TrackerRow[];
  onUpdate: (id: string, progress: number) => void;
  editableProgress: boolean;
}) {
  return (
    <div className="space-y-3">
      {trackers.map((t) => (
        <div key={t.id} className="rounded-card border border-surface-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{t.goal}</p>
              <p className="text-xs text-ink-soft">{t.employeeName}</p>
            </div>
            <span className="text-sm font-medium text-ink">{t.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
            <div className="h-full bg-brand-gradient" style={{ width: `${t.progress}%` }} />
          </div>
          {editableProgress && (
            <input
              type="range"
              min={0}
              max={100}
              value={t.progress}
              onChange={(e) => onUpdate(t.id, Number(e.target.value))}
              className="mt-2 w-full"
            />
          )}
        </div>
      ))}
      {trackers.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-soft">No trackers yet.</p>
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={null}>
      <PerformancePageInner />
    </Suspense>
  );
}

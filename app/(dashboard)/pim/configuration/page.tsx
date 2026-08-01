"use client";

import { useState } from "react";
import { SlidersHorizontal, ListPlus, Upload, Wallet, UserX, Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { OptionalField, ReportingMethod, TerminationReason } from "@/lib/types";

const SEED_OPTIONAL_FIELDS: OptionalField[] = [
  { key: "middleName", label: "Middle Name", visible: false },
  { key: "otherId", label: "Other ID", visible: false },
  { key: "drivingLicense", label: "Driving License Number", visible: true },
  { key: "militaryService", label: "Military Service", visible: false },
  { key: "smoker", label: "Smoker", visible: false }
];

const SEED_REPORTING_METHODS: ReportingMethod[] = [
  { id: "1", name: "Direct Deposit" },
  { id: "2", name: "Cash" }
];

const SEED_TERMINATION_REASONS: TerminationReason[] = [
  { id: "1", name: "Resignation" },
  { id: "2", name: "End of Contract" },
  { id: "3", name: "Termination for Cause" },
  { id: "4", name: "Retirement" }
];

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

const TABS = [
  { key: "optionalfields", label: "Optional Fields", icon: SlidersHorizontal },
  { key: "customfields", label: "Custom Fields", icon: ListPlus },
  { key: "dataimport", label: "Data Import", icon: Upload },
  { key: "reportingmethods", label: "Reporting Methods", icon: Wallet },
  { key: "terminationreasons", label: "Termination Reasons", icon: UserX }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PimConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("optionalfields");
  const [fields, setFields] = useState<OptionalField[]>(SEED_OPTIONAL_FIELDS);
  const [reportingMethods, setReportingMethods] = useState<ReportingMethod[]>(SEED_REPORTING_METHODS);
  const [terminationReasons, setTerminationReasons] = useState<TerminationReason[]>(SEED_TERMINATION_REASONS);
  const [newMethod, setNewMethod] = useState("");
  const [newReason, setNewReason] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  function toggleField(key: string) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, visible: !f.visible } : f)));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">PIM Configuration</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Controls what appears on Employee records and how bulk changes happen.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm",
              activeTab === key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-2xl">
        {activeTab === "optionalfields" && (
          <div>
            <p className="mb-3 text-sm text-ink-muted">
              Show or hide these fields on Employee &amp; My Info screens —
              they exist in the schema either way, this only controls
              visibility.
            </p>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              {fields.map((f, i) => (
                <label key={f.key} className={clsx("flex items-center justify-between px-4 py-3", i > 0 && "border-t border-surface-border")}>
                  <span className="text-sm text-ink">{f.label}</span>
                  <input type="checkbox" checked={f.visible} onChange={() => toggleField(f.key)} />
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === "customfields" && (
          <div className="rounded-card border border-surface-border bg-white p-6 text-sm text-ink-muted">
            Custom Fields are managed in one place platform-wide — see{" "}
            <a href="/admin/configuration" className="text-brand-700 hover:underline">Admin → Configuration → Custom Fields</a>{" "}
            rather than a duplicate list here.
          </div>
        )}

        {activeTab === "dataimport" && (
          <div className="space-y-4 rounded-card border border-surface-border bg-white p-6">
            <p className="text-sm text-ink-muted">
              Bulk-create or update employee records from a CSV file.
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="importFile" className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
                <Upload size={14} /> Choose CSV file
              </label>
              <input
                id="importFile"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              {importFile && <span className="text-xs text-ink-soft">{importFile.name}</span>}
            </div>
            <button
              disabled={!importFile}
              className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Preview import
            </button>
            <p className="text-xs text-ink-soft">
              Preview matches rows to existing employees by Employee ID
              before anything is written — no direct import without a
              review step.
            </p>
          </div>
        )}

        {activeTab === "reportingmethods" && (
          <div>
            <div className="mb-3 flex gap-2">
              <input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} placeholder="e.g. Bank Transfer" className={inputCls} />
              <button
                onClick={() => {
                  if (!newMethod.trim()) return;
                  setReportingMethods((prev) => [...prev, { id: crypto.randomUUID(), name: newMethod.trim() }]);
                  setNewMethod("");
                }}
                className="flex items-center gap-1.5 rounded-md bg-brand-gradient px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              {reportingMethods.map((m, i) => (
                <div key={m.id} className={clsx("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
                  <span className="text-ink">{m.name}</span>
                  <button onClick={() => setReportingMethods((prev) => prev.filter((x) => x.id !== m.id))} className="text-ink-soft hover:text-state-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "terminationreasons" && (
          <div>
            <div className="mb-3 flex gap-2">
              <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="e.g. Redundancy" className={inputCls} />
              <button
                onClick={() => {
                  if (!newReason.trim()) return;
                  setTerminationReasons((prev) => [...prev, { id: crypto.randomUUID(), name: newReason.trim() }]);
                  setNewReason("");
                }}
                className="flex items-center gap-1.5 rounded-md bg-brand-gradient px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="overflow-hidden rounded-card border border-surface-border bg-white">
              {terminationReasons.map((r, i) => (
                <div key={r.id} className={clsx("flex items-center justify-between px-4 py-3 text-sm", i > 0 && "border-t border-surface-border")}>
                  <span className="text-ink">{r.name}</span>
                  <button onClick={() => setTerminationReasons((prev) => prev.filter((x) => x.id !== r.id))} className="text-ink-soft hover:text-state-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

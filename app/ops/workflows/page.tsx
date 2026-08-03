import { GitBranch } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Workflows</h1>
      <p className="mt-1 text-sm text-ink-muted">Configurable multi-step approval chains.</p>

      <div className="mt-6 max-w-2xl rounded-card border border-state-warning/30 bg-state-warningBg p-4">
        <div className="flex items-start gap-3">
          <GitBranch size={18} className="mt-0.5 shrink-0 text-state-warning" />
          <div className="text-sm text-ink-muted">
            <p className="font-medium text-state-warning">Not built — genuinely, not just deferred</p>
            <p className="mt-2">
              Every approval flow built so far (Requests, Purchase Requests, IT Tickets, Expenses, Leave, Timesheets, Claims)
              uses a fixed single-approver pattern: submit &rarr; one person approves or rejects. A real Workflows module means
              something categorically different — configurable multi-step chains (e.g. &quot;Purchase Orders over $500 need
              Manager then Finance then Director&quot;), branching logic, and a rules engine to evaluate them. That&apos;s a
              genuine engineering project on its own, not a CRUD screen with a form — building a shallow version now would
              produce something that looks like a workflow builder but doesn&apos;t actually chain approvals, which is worse
              than admitting it isn&apos;t built yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

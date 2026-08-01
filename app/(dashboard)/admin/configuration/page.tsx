"use client";

import { useState } from "react";
import {
  Mail,
  Bell,
  Globe,
  Package,
  Blocks,
  KeyRound,
  Lock,
  ListPlus,
  Monitor,
  History,
  FileCheck,
  Activity,
  Plus,
  Trash2,
  Pencil
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import type {
  EmailConfig,
  EmailSubscription,
  ModuleToggle,
  PasswordPolicy,
  CustomField,
  ActiveSession,
  AuditLogEntry,
  TosDocument,
  SocialAuthProvider
} from "@/lib/types";

const TABS = [
  { key: "email", label: "Email Config", icon: Mail },
  { key: "subscriptions", label: "Email Subscriptions", icon: Bell },
  { key: "localization", label: "Localization", icon: Globe },
  { key: "modules", label: "Modules", icon: Package },
  { key: "socialauth", label: "Social/Third-Party Auth", icon: Blocks },
  { key: "password", label: "Password Policy", icon: Lock },
  { key: "customfields", label: "Custom Fields", icon: ListPlus },
  { key: "sessions", label: "Active Sessions", icon: Monitor },
  { key: "audit", label: "Audit Log", icon: History },
  { key: "tos", label: "Terms / Privacy", icon: FileCheck },
  { key: "health", label: "System Health", icon: Activity }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("email");

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Configuration
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Platform-wide settings — email, security policy, modules, and
        diagnostics.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm",
              activeTab === key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "email" && <EmailConfigTab />}
        {activeTab === "subscriptions" && <EmailSubscriptionsTab />}
        {activeTab === "localization" && <LocalizationTab />}
        {activeTab === "modules" && <ModulesTab />}
        {activeTab === "socialauth" && <SocialAuthTab />}
        {activeTab === "password" && <PasswordPolicyTab />}
        {activeTab === "customfields" && <CustomFieldsTab />}
        {activeTab === "sessions" && <ActiveSessionsTab />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "tos" && <TosTab />}
        {activeTab === "health" && <SystemHealthTab />}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6">
      {children}
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

// ---------------------------------------------------------------------
// 5.1 Email Configuration
// ---------------------------------------------------------------------
function EmailConfigTab() {
  const [config, setConfig] = useState<EmailConfig>({
    mailSentAs: "no-reply@vertexhrm.app",
    sendingMethod: "smtp",
    pathToSendmail: ""
  });
  const [testSent, setTestSent] = useState(false);

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Mail Sent As *">
          <input
            className={inputCls}
            value={config.mailSentAs}
            onChange={(e) =>
              setConfig((c) => ({ ...c, mailSentAs: e.target.value }))
            }
          />
        </Field>
        <Field label="Sending Method">
          <div className="flex gap-4 text-sm">
            {(["secure_smtp", "smtp", "sendmail"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="sendingMethod"
                  checked={config.sendingMethod === m}
                  onChange={() =>
                    setConfig((c) => ({ ...c, sendingMethod: m }))
                  }
                />
                {m === "secure_smtp" ? "Secure SMTP" : m === "smtp" ? "SMTP" : "Sendmail"}
              </label>
            ))}
          </div>
        </Field>
        {config.sendingMethod === "sendmail" && (
          <Field label="Path to sendmail">
            <input
              className={inputCls}
              value={config.pathToSendmail}
              onChange={(e) =>
                setConfig((c) => ({ ...c, pathToSendmail: e.target.value }))
              }
              placeholder="/usr/sbin/sendmail"
            />
          </Field>
        )}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              setTestSent(true);
              setTimeout(() => setTestSent(false), 2000);
            }}
            className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            Send test mail
          </button>
          <button className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Save
          </button>
          {testSent && (
            <span className="text-sm text-state-success">Test mail queued</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.2 Email Subscriptions
// ---------------------------------------------------------------------
function EmailSubscriptionsTab() {
  const [subs] = useState<EmailSubscription[]>([
    { id: "1", notificationType: "Leave Application", subscriberCount: 2 },
    { id: "2", notificationType: "Leave Approvals", subscriberCount: 2 },
    { id: "3", notificationType: "Leave Rejections", subscriberCount: 1 },
    { id: "4", notificationType: "Permission Change", subscriberCount: 1 }
  ]);

  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Notification type</th>
            <th className="px-4 py-3">Subscribers</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-t border-surface-border">
              <td className="px-4 py-3 font-medium text-ink">
                {s.notificationType}
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {s.subscriberCount} subscriber{s.subscriberCount === 1 ? "" : "s"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <button
                    aria-label={`Edit subscribers for ${s.notificationType}`}
                    className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.3 Localization
// ---------------------------------------------------------------------
function LocalizationTab() {
  return (
    <Card>
      <div className="space-y-4">
        <Field label="Language">
          <select className={inputCls} defaultValue="en">
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </Field>
        <Field label="Date Format">
          <select className={inputCls} defaultValue="dd-mm-yyyy">
            <option value="dd-mm-yyyy">DD-MM-YYYY</option>
            <option value="mm-dd-yyyy">MM-DD-YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </Field>
        <button className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Save
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.5 Modules
// ---------------------------------------------------------------------
function ModulesTab() {
  const [modules, setModules] = useState<ModuleToggle[]>([
    { key: "admin", name: "Admin", enabled: true },
    { key: "pim", name: "PIM", enabled: false },
    { key: "leave", name: "Leave", enabled: true },
    { key: "time", name: "Time", enabled: false },
    { key: "recruitment", name: "Recruitment", enabled: false },
    { key: "performance", name: "Performance", enabled: false },
    { key: "directory", name: "Directory", enabled: false },
    { key: "maintenance", name: "Maintenance", enabled: false },
    { key: "mobile", name: "Mobile", enabled: false },
    { key: "claims", name: "Claims", enabled: false },
    { key: "buzz", name: "Buzz", enabled: false }
  ]);

  function toggle(key: string) {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m))
    );
  }

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">
        Disabling a module hides it from every user&apos;s navigation. Admin
        and this Configuration screen can&apos;t be disabled from here.
      </p>
      <div className="grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <label
            key={m.key}
            className="flex items-center justify-between rounded-card border border-surface-border bg-white px-4 py-3"
          >
            <span className="text-sm text-ink">{m.name}</span>
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={() => toggle(m.key)}
              disabled={m.key === "admin"}
            />
          </label>
        ))}
      </div>
      <button className="mt-4 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
        Save
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.6 Social / Third-Party Authentication
// ---------------------------------------------------------------------
function SocialAuthTab() {
  const [providers, setProviders] = useState<SocialAuthProvider[]>([]);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setProviders((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        clientId: String(form.get("clientId")),
        providerUrl: String(form.get("providerUrl"))
      }
    ]);
    setAdding(false);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add provider
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Provider name</th>
              <th className="px-4 py-3">Client ID</th>
              <th className="px-4 py-3">Provider URL</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-3 text-ink-muted">{p.clientId}</td>
                <td className="px-4 py-3 text-ink-muted">{p.providerUrl}</td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">
                  No providers configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add provider" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Name *">
              <input name="name" required className={inputCls} />
            </Field>
            <Field label="Client ID *">
              <input name="clientId" required className={inputCls} />
            </Field>
            <Field label="Provider URL *">
              <input name="providerUrl" required className={inputCls} />
            </Field>
            <Field label="Client Secret *">
              <input name="clientSecret" required type="password" className={inputCls} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
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

// ---------------------------------------------------------------------
// 5.7 Password Policy
// ---------------------------------------------------------------------
function PasswordPolicyTab() {
  const [policy, setPolicy] = useState<PasswordPolicy>({
    minLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    expiryDays: 0,
    lockoutAttempts: 5,
    lockoutMinutes: 15,
    require2fa: false,
    sessionTimeoutMinutes: 30,
    adminIpAllowlist: ""
  });

  return (
    <Card>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum length *">
            <input
              type="number"
              className={inputCls}
              value={policy.minLength}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, minLength: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Password expiry (days, 0 = never)">
            <input
              type="number"
              className={inputCls}
              value={policy.expiryDays}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, expiryDays: Number(e.target.value) }))
              }
            />
          </Field>
        </div>

        <div className="space-y-2 text-sm text-ink">
          {[
            ["requireUppercase", "Require uppercase letter"],
            ["requireNumber", "Require number"],
            ["requireSpecialChar", "Require special character"],
            ["require2fa", "Require two-factor authentication"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policy[key as keyof PasswordPolicy] as boolean}
                onChange={() =>
                  setPolicy((p) => ({ ...p, [key]: !p[key as keyof PasswordPolicy] }))
                }
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lockout after failed attempts">
            <input
              type="number"
              className={inputCls}
              value={policy.lockoutAttempts}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, lockoutAttempts: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Lockout duration (minutes)">
            <input
              type="number"
              className={inputCls}
              value={policy.lockoutMinutes}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, lockoutMinutes: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Session timeout (minutes)">
            <input
              type="number"
              className={inputCls}
              value={policy.sessionTimeoutMinutes}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  sessionTimeoutMinutes: Number(e.target.value)
                }))
              }
            />
          </Field>
        </div>

        <Field label="Restrict admin login to IP range(s)">
          <input
            className={inputCls}
            placeholder="e.g. 41.72.xxx.xxx/32 — leave blank for no restriction"
            value={policy.adminIpAllowlist}
            onChange={(e) =>
              setPolicy((p) => ({ ...p, adminIpAllowlist: e.target.value }))
            }
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
            Reset to default
          </button>
          <button className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Save
          </button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.8 Custom Fields
// ---------------------------------------------------------------------
function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [adding, setAdding] = useState(false);
  const [fieldType, setFieldType] = useState<CustomField["fieldType"]>("Text");

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: String(form.get("label")),
        appliesTo: form.get("appliesTo") as CustomField["appliesTo"],
        fieldType,
        required: form.get("required") === "on"
      }
    ]);
    setAdding(false);
    setFieldType("Text");
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Add custom field
        </button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Field label</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{f.label}</td>
                <td className="px-4 py-3 text-ink-muted">{f.appliesTo}</td>
                <td className="px-4 py-3 text-ink-muted">{f.fieldType}</td>
                <td className="px-4 py-3 text-ink-muted">{f.required ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setFields((prev) => prev.filter((x) => x.id !== f.id))}
                      aria-label={`Delete ${f.label}`}
                      className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">
                  No custom fields yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Add custom field" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Field label *">
              <input name="label" required className={inputCls} />
            </Field>
            <Field label="Applies to *">
              <select name="appliesTo" required className={inputCls} defaultValue="Employee">
                <option value="Employee">Employee</option>
                <option value="Job Title">Job Title</option>
              </select>
            </Field>
            <Field label="Field type *">
              <select
                className={inputCls}
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as CustomField["fieldType"])}
              >
                {(["Text", "Number", "Date", "Dropdown", "Checkbox", "File"] as const).map(
                  (t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  )
                )}
              </select>
            </Field>
            {fieldType === "Dropdown" && (
              <Field label="Options (comma-separated)">
                <input name="options" className={inputCls} placeholder="Option A, Option B" />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="required" /> Required
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
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

// ---------------------------------------------------------------------
// 5.9 Active Sessions
// ---------------------------------------------------------------------
function ActiveSessionsTab() {
  const [sessions, setSessions] = useState<ActiveSession[]>([
    { id: "1", username: "j.esparon", device: "Chrome on macOS", ipAddress: "41.72.xxx.12", loginTime: "2026-08-01 09:12" },
    { id: "2", username: "m.dubel", device: "Safari on iOS", ipAddress: "41.72.xxx.44", loginTime: "2026-08-01 10:03" }
  ]);

  function forceLogout(id: string) {
    if (!confirm("Force logout this session?")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    // TODO(supabase): revoke the session server-side (Supabase Admin API
    // signOut for that user), not just remove the row locally.
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {sessions.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Force logout all active sessions?")) setSessions([]);
            }}
            className="rounded-md border border-state-danger px-4 py-2 text-sm text-state-danger hover:bg-state-dangerBg"
          >
            Force logout all
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Device / browser</th>
              <th className="px-4 py-3">IP address</th>
              <th className="px-4 py-3">Login time</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-surface-border">
                <td className="px-4 py-3 font-medium text-ink">{s.username}</td>
                <td className="px-4 py-3 text-ink-muted">{s.device}</td>
                <td className="px-4 py-3 text-ink-muted">{s.ipAddress}</td>
                <td className="px-4 py-3 text-ink-muted">{s.loginTime}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => forceLogout(s.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-state-danger hover:bg-state-dangerBg"
                    >
                      Force logout
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.10 Audit Log
// ---------------------------------------------------------------------
function AuditLogTab() {
  const [entries] = useState<AuditLogEntry[]>([
    { id: "1", timestamp: "2026-08-01 09:12", user: "j.esparon", action: "Login", module: "Auth", details: "" },
    { id: "2", timestamp: "2026-08-01 09:15", user: "j.esparon", action: "Create", module: "Users", details: "Created user m.dubel" },
    { id: "3", timestamp: "2026-08-01 10:20", user: "j.esparon", action: "Permission Change", module: "Roles", details: "Edited Supervisor permissions" }
  ]);
  const [filterModule, setFilterModule] = useState("");

  const filtered = filterModule
    ? entries.filter((e) => e.module === filterModule)
    : entries;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          className={clsx(inputCls, "max-w-xs")}
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
        >
          <option value="">All modules</option>
          {[...new Set(entries.map((e) => e.module))].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
          Export CSV
        </button>
      </div>
      <p className="mb-3 text-xs text-ink-soft">
        Append-only — there is no edit or delete action anywhere in this
        screen, by design.
      </p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-t border-surface-border">
                <td className="px-4 py-3 text-ink-muted">{e.timestamp}</td>
                <td className="px-4 py-3 font-medium text-ink">{e.user}</td>
                <td className="px-4 py-3 text-ink-muted">{e.action}</td>
                <td className="px-4 py-3 text-ink-muted">{e.module}</td>
                <td className="px-4 py-3 text-ink-muted">{e.details || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.11 Terms of Service / Privacy Policy
// ---------------------------------------------------------------------
function TosTab() {
  const [docs, setDocs] = useState<TosDocument[]>([
    { id: "1", type: "Terms of Service", version: 1, effectiveDate: "2026-01-01", requireReacceptance: false },
    { id: "2", type: "Privacy Policy", version: 1, effectiveDate: "2026-01-01", requireReacceptance: false }
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      {docs.map((doc) => (
        <div key={doc.id} className="rounded-card border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-medium text-ink">
                {doc.type}
              </h3>
              <p className="text-xs text-ink-soft">
                Version {doc.version} — effective {doc.effectiveDate}
              </p>
            </div>
            <button className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle">
              Edit &amp; publish new version
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={doc.requireReacceptance}
              onChange={() =>
                setDocs((prev) =>
                  prev.map((d) =>
                    d.id === doc.id
                      ? { ...d, requireReacceptance: !d.requireReacceptance }
                      : d
                  )
                )
              }
            />
            Require every user to re-accept before continuing
          </label>
        </div>
      ))}
      <p className="text-xs text-ink-soft">
        Acceptance Log (who accepted which version, when) rolls up into the
        Consent Record in Compliance §6.1.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.12 System Health
// ---------------------------------------------------------------------
function SystemHealthTab() {
  const items = [
    { label: "Database connection", value: "Connected", ok: true },
    { label: "Storage used", value: "142 MB of 1 GB", ok: true },
    { label: "Last automated backup", value: "2026-08-01 03:00 — Success", ok: true },
    { label: "Scheduled maintenance", value: "None scheduled", ok: true }
  ];

  return (
    <div className="max-w-2xl overflow-hidden rounded-card border border-surface-border bg-white">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={clsx(
            "flex items-center justify-between px-5 py-4",
            i > 0 && "border-t border-surface-border"
          )}
        >
          <span className="text-sm text-ink">{item.label}</span>
          <span
            className={clsx(
              "flex items-center gap-2 text-sm font-medium",
              item.ok ? "text-state-success" : "text-state-danger"
            )}
          >
            <span
              className={clsx(
                "h-2 w-2 rounded-full",
                item.ok ? "bg-state-success" : "bg-state-danger"
              )}
            />
            {item.value}
          </span>
        </div>
      ))}
      <p className="border-t border-surface-border px-5 py-3 text-xs text-ink-soft">
        Diagnostic only — this is real data once wired to Supabase&apos;s
        status API and Storage usage endpoint; currently illustrative.
      </p>
    </div>
  );
}

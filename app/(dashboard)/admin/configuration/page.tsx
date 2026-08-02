"use client";

import { useEffect, useState } from "react";
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
  Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

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
      <h1 className="font-display text-2xl font-medium text-ink">Configuration</h1>
      <p className="mt-1 text-sm text-ink-muted">Platform-wide settings — live from Supabase where noted.</p>

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
  return <div className="max-w-2xl rounded-card border border-surface-border bg-white p-6">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
function Loading() {
  return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
}

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500";

// ---------------------------------------------------------------------
// 5.1 Email Configuration
// ---------------------------------------------------------------------
function EmailConfigTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ mail_sent_as: string; sending_method: string; path_to_sendmail: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_config").select("*").eq("id", true).single();
    setConfig(data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    await supabase.from("email_config").update({
      mail_sent_as: config.mail_sent_as,
      sending_method: config.sending_method,
      path_to_sendmail: config.path_to_sendmail
    }).eq("id", true);
    setSaving(false);
  }

  if (loading || !config) return <Loading />;

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Mail Sent As *">
          <input className={inputCls} value={config.mail_sent_as} onChange={(e) => setConfig({ ...config, mail_sent_as: e.target.value })} />
        </Field>
        <Field label="Sending Method">
          <div className="flex gap-4 text-sm">
            {(["secure_smtp", "smtp", "sendmail"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input type="radio" name="sendingMethod" checked={config.sending_method === m} onChange={() => setConfig({ ...config, sending_method: m })} />
                {m === "secure_smtp" ? "Secure SMTP" : m === "smtp" ? "SMTP" : "Sendmail"}
              </label>
            ))}
          </div>
        </Field>
        {config.sending_method === "sendmail" && (
          <Field label="Path to sendmail">
            <input className={inputCls} value={config.path_to_sendmail ?? ""} onChange={(e) => setConfig({ ...config, path_to_sendmail: e.target.value })} placeholder="/usr/sbin/sendmail" />
          </Field>
        )}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 2000); }} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
            Send test mail
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
          {testSent && <span className="text-sm text-state-success">Test mail queued</span>}
        </div>
        <p className="text-xs text-ink-soft">
          &quot;Send test mail&quot; is UI-only — actually sending requires wiring this config to Supabase Edge Functions or a transactional email provider.
        </p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.2 Email Subscriptions
// ---------------------------------------------------------------------
interface SubRow { id: string; notification_type: string; subscriber_ids: string[] }

function EmailSubscriptionsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_subscriptions").select("id, notification_type, subscriber_ids").order("notification_type");
    setSubs((data as SubRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) return <Loading />;

  return (
    <div className="overflow-hidden rounded-card border border-surface-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
          <tr><th className="px-4 py-3">Notification type</th><th className="px-4 py-3">Subscribers</th></tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-t border-surface-border">
              <td className="px-4 py-3 font-medium text-ink">{s.notification_type}</td>
              <td className="px-4 py-3 text-ink-muted">{s.subscriber_ids?.length ?? 0} subscriber{(s.subscriber_ids?.length ?? 0) === 1 ? "" : "s"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-surface-border px-4 py-3 text-xs text-ink-soft">
        Assigning individual subscribers per notification type isn&apos;t wired yet — the list itself is real, editing who&apos;s subscribed needs a user-picker still to be built.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.3 Localization
// ---------------------------------------------------------------------
function LocalizationTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{ language: string; date_format: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("localization_settings").select("*").eq("id", true).single();
    setSettings(data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    await supabase.from("localization_settings").update(settings).eq("id", true);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading || !settings) return <Loading />;

  return (
    <Card>
      <div className="space-y-4">
        <Field label="Language">
          <select className={inputCls} value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}>
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </Field>
        <Field label="Date Format">
          <select className={inputCls} value={settings.date_format} onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}>
            <option value="dd-mm-yyyy">DD-MM-YYYY</option>
            <option value="mm-dd-yyyy">MM-DD-YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </Field>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
          {saved && <span className="text-sm text-state-success">Saved</span>}
        </div>
        <p className="text-xs text-ink-soft">Saves the setting — actually switching the UI&apos;s language/date rendering everywhere is a separate i18n effort, not wired yet.</p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.5 Modules
// ---------------------------------------------------------------------
interface ModuleRow { key: string; name: string; enabled: boolean }

function ModulesTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("modules").select("key, name, enabled").order("name");
    setModules((data as ModuleRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(key: string, enabled: boolean) {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, enabled: !enabled } : m)));
    await supabase.from("modules").update({ enabled: !enabled }).eq("key", key);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">
        Toggling here updates the database — the sidebar doesn&apos;t yet read this table to actually hide/show nav items, so it&apos;s recorded but not enforced in the UI yet.
      </p>
      <div className="grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <label key={m.key} className="flex items-center justify-between rounded-card border border-surface-border bg-white px-4 py-3">
            <span className="text-sm text-ink">{m.name}</span>
            <input type="checkbox" checked={m.enabled} onChange={() => toggle(m.key, m.enabled)} disabled={m.key === "admin"} />
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.6 Social / Third-Party Authentication (via API — holds a secret)
// ---------------------------------------------------------------------
interface ProviderRow { id: string; name: string; client_id: string; provider_url: string }

function SocialAuthTab() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/social-auth-providers");
    const body = await res.json();
    setProviders(body.providers ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/social-auth-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        clientId: form.get("clientId"),
        providerUrl: form.get("providerUrl"),
        clientSecret: form.get("clientSecret")
      })
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error);
      return;
    }
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add provider</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? <Loading /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Provider name</th><th className="px-4 py-3">Client ID</th><th className="px-4 py-3">Provider URL</th></tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-surface-border"><td className="px-4 py-3 font-medium text-ink">{p.name}</td><td className="px-4 py-3 text-ink-muted">{p.client_id}</td><td className="px-4 py-3 text-ink-muted">{p.provider_url}</td></tr>
              ))}
              {providers.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-ink-soft">No providers configured.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Client Secret is never sent back to the browser after saving — this list only ever shows the non-secret fields.</p>

      {adding && (
        <Modal title="Add provider" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Name *"><input name="name" required className={inputCls} /></Field>
            <Field label="Client ID *"><input name="clientId" required className={inputCls} /></Field>
            <Field label="Provider URL *"><input name="providerUrl" required className={inputCls} /></Field>
            <Field label="Client Secret *"><input name="clientSecret" required type="password" className={inputCls} /></Field>
            {error && <p className="text-sm text-state-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
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
interface PolicyRow {
  min_length: number; require_uppercase: boolean; require_number: boolean; require_special_char: boolean;
  expiry_days: number; lockout_attempts: number; lockout_minutes: number; require_2fa: boolean;
  session_timeout_minutes: number; admin_ip_allowlist: string | null;
}

function PasswordPolicyTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("password_policy").select("*").eq("id", true).single();
    setPolicy(data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!policy) return;
    setSaving(true);
    await supabase.from("password_policy").update(policy).eq("id", true);
    setSaving(false);
  }

  if (loading || !policy) return <Loading />;

  return (
    <Card>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum length *"><input type="number" className={inputCls} value={policy.min_length} onChange={(e) => setPolicy({ ...policy, min_length: Number(e.target.value) })} /></Field>
          <Field label="Password expiry (days, 0 = never)"><input type="number" className={inputCls} value={policy.expiry_days} onChange={(e) => setPolicy({ ...policy, expiry_days: Number(e.target.value) })} /></Field>
        </div>
        <div className="space-y-2 text-sm text-ink">
          {([
            ["require_uppercase", "Require uppercase letter"],
            ["require_number", "Require number"],
            ["require_special_char", "Require special character"],
            ["require_2fa", "Require two-factor authentication"]
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={policy[key]} onChange={() => setPolicy({ ...policy, [key]: !policy[key] })} />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lockout after failed attempts"><input type="number" className={inputCls} value={policy.lockout_attempts} onChange={(e) => setPolicy({ ...policy, lockout_attempts: Number(e.target.value) })} /></Field>
          <Field label="Lockout duration (minutes)"><input type="number" className={inputCls} value={policy.lockout_minutes} onChange={(e) => setPolicy({ ...policy, lockout_minutes: Number(e.target.value) })} /></Field>
          <Field label="Session timeout (minutes)"><input type="number" className={inputCls} value={policy.session_timeout_minutes} onChange={(e) => setPolicy({ ...policy, session_timeout_minutes: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Restrict admin login to IP range(s)">
          <input className={inputCls} placeholder="e.g. 41.72.xxx.xxx/32 — leave blank for no restriction" value={policy.admin_ip_allowlist ?? ""} onChange={(e) => setPolicy({ ...policy, admin_ip_allowlist: e.target.value })} />
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
        </div>
        <p className="text-xs text-ink-soft">
          Saved for reference/audit — enforcing these at login (complexity, lockout, session timeout) requires Supabase Auth hooks or a custom auth flow, not wired to actual sign-in behavior yet.
        </p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// 5.8 Custom Fields
// ---------------------------------------------------------------------
interface CustomFieldRow { id: string; label: string; applies_to: string; field_type: string; required: boolean }

function CustomFieldsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<CustomFieldRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldType, setFieldType] = useState("Text");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("custom_fields").select("id, label, applies_to, field_type, required").order("label");
    setFields((data as CustomFieldRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await supabase.from("custom_fields").insert({
      label: form.get("label"),
      applies_to: form.get("appliesTo"),
      field_type: fieldType,
      required: form.get("required") === "on"
    });
    setSaving(false);
    setAdding(false);
    setFieldType("Text");
    load();
  }

  async function remove(id: string) {
    await supabase.from("custom_fields").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"><Plus size={16} /> Add custom field</button>
      </div>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? <Loading /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Field label</th><th className="px-4 py-3">Applies to</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Required</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{f.label}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.applies_to}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.field_type}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><button onClick={() => remove(f.id)} aria-label={`Delete ${f.label}`} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}
              {fields.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">No custom fields yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Defines the field — actually rendering it on Employee/Job Title forms and storing values in custom_field_values isn&apos;t wired yet.</p>

      {adding && (
        <Modal title="Add custom field" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <Field label="Field label *"><input name="label" required className={inputCls} /></Field>
            <Field label="Applies to *">
              <select name="appliesTo" required className={inputCls} defaultValue="Employee"><option value="Employee">Employee</option><option value="Job Title">Job Title</option></select>
            </Field>
            <Field label="Field type *">
              <select className={inputCls} value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
                {["Text", "Number", "Date", "Dropdown", "Checkbox", "File"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="required" /> Required</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.9 Active Sessions — not backed by a real table; Supabase doesn't
// expose per-user session listing to a client-side query, only via
// the Admin API (which can revoke, but doesn't enumerate active
// sessions with device/IP metadata out of the box). Left illustrative
// rather than wired to something fake-looking-real.
// ---------------------------------------------------------------------
interface SessionRow {
  id: string; user_id: string; device_info: string | null; login_at: string; logout_at: string | null;
  app_users: { username: string; force_logout_after: string | null } | { username: string; force_logout_after: string | null }[] | null;
}

function ActiveSessionsTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("user_sessions")
      .select("id, user_id, device_info, login_at, logout_at, app_users(username, force_logout_after)")
      .is("logout_at", null)
      .order("login_at", { ascending: false });
    setSessions((data as unknown as SessionRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function one<T>(v: T | T[] | null): T | null {
    return Array.isArray(v) ? v[0] ?? null : v;
  }

  async function forceLogout(userId: string) {
    if (!confirm("Force logout this user? This signs them out of every device on their next page load.")) return;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceLogout: true })
    });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error);
      return;
    }
    load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">
        Real login events — sessions still open (no logout recorded yet). Force logout can&apos;t target one specific
        device (Supabase Auth doesn&apos;t expose that cleanly) — it signs the person out everywhere on their next page
        load, checked server-side in the dashboard layout.
      </p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="px-4 py-3">Username</th><th className="px-4 py-3">Device</th><th className="px-4 py-3">Login time</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const author = one(s.app_users);
              return (
                <tr key={s.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-ink">{author?.username ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{s.device_info ?? "Unknown device"}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(s.login_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => forceLogout(s.user_id)} className="rounded-md px-2 py-1 text-xs font-medium text-state-danger hover:bg-state-dangerBg">Force logout</button>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No open sessions on file yet — this fills in as people log in.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.10 Audit Log
// ---------------------------------------------------------------------
interface AuditRow { id: string; created_at: string; action: string; module: string | null; details: unknown }

function AuditLogTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [filterModule, setFilterModule] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("audit_log").select("id, created_at, action, module, details").order("created_at", { ascending: false }).limit(200);
    setEntries((data as AuditRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const modules = [...new Set(entries.map((e) => e.module).filter(Boolean))] as string[];
  const filtered = filterModule ? entries.filter((e) => e.module === filterModule) : entries;

  function exportCsv() {
    const rows = filtered.map((e) => [e.created_at, e.action, e.module ?? "", JSON.stringify(e.details ?? "")]);
    const csv = [["Timestamp", "Action", "Module", "Details"], ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className={clsx(inputCls, "max-w-xs")} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
          <option value="">All modules</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={exportCsv} className="rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Export CSV</button>
      </div>
      <p className="mb-3 text-xs text-ink-soft">
        Append-only, real data — no edit or delete action exists anywhere in this screen, by design. Most other
        modules still don&apos;t write to this table yet (their audit_log TODOs are still pending), so this may look
        sparse until more of the app logs to it.
      </p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-white">
        {loading ? <Loading /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Details</th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-ink-muted">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.action}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.module ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.details ? JSON.stringify(e.details) : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-soft">No entries yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.11 Terms of Service / Privacy Policy
// ---------------------------------------------------------------------
interface TosRow { id: string; type: string; version: number; effective_date: string; require_reacceptance: boolean }

function TosTab() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<TosRow[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("tos_documents").select("id, type, version, effective_date, require_reacceptance").order("type");
    setDocs((data as TosRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(id: string, val: boolean) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, require_reacceptance: !val } : d)));
    await supabase.from("tos_documents").update({ require_reacceptance: !val }).eq("id", id);
  }

  if (loading) return <Loading />;

  return (
    <div className="max-w-2xl space-y-4">
      {docs.map((doc) => (
        <div key={doc.id} className="rounded-card border border-surface-border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-medium text-ink">{doc.type}</h3>
              <p className="text-xs text-ink-soft">Version {doc.version} — effective {doc.effective_date}</p>
            </div>
            <button className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-subtle">Edit &amp; publish new version</button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={doc.require_reacceptance} onChange={() => toggle(doc.id, doc.require_reacceptance)} />
            Require every user to re-accept before continuing
          </label>
        </div>
      ))}
      {docs.length === 0 && <p className="text-sm text-ink-soft">No policy documents on file.</p>}
      <p className="text-xs text-ink-soft">
        &quot;Edit &amp; publish new version&quot; isn&apos;t wired — this tab reads/toggles the requirement flag for real;
        actually editing document content and versioning it is separate work.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5.12 System Health — no real monitoring integration exists (would
// need actual infra hooks: Supabase status API, Storage usage
// endpoint, a backup schedule to report on). Kept illustrative.
// ---------------------------------------------------------------------
function SystemHealthTab() {
  const items = [
    { label: "Database connection", value: "Connected", ok: true },
    { label: "Storage used", value: "Not monitored yet", ok: true },
    { label: "Last automated backup", value: "Not monitored yet", ok: true },
    { label: "Scheduled maintenance", value: "None scheduled", ok: true }
  ];
  return (
    <div className="max-w-2xl overflow-hidden rounded-card border border-surface-border bg-white">
      {items.map((item, i) => (
        <div key={item.label} className={clsx("flex items-center justify-between px-5 py-4", i > 0 && "border-t border-surface-border")}>
          <span className="text-sm text-ink">{item.label}</span>
          <span className={clsx("flex items-center gap-2 text-sm font-medium", item.ok ? "text-state-success" : "text-state-danger")}>
            <span className={clsx("h-2 w-2 rounded-full", item.ok ? "bg-state-success" : "bg-state-danger")} />
            {item.value}
          </span>
        </div>
      ))}
      <p className="border-t border-surface-border px-5 py-3 text-xs text-ink-soft">
        Diagnostic only — real data here needs Supabase&apos;s status API and Storage usage endpoint wired in; not done yet.
      </p>
    </div>
  );
}

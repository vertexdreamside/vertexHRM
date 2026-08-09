"use client";

import { useEffect, useState } from "react";
import {
  User, Phone, ShieldAlert, Users2, Plane, Briefcase, Wallet,
  UserCog, GraduationCap, Award, Plus, Trash2, Pencil, Paperclip, Download, Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

// TODO(supabase): Personal/Contact/Job read from the current user's
// `employees` row (via app_users.employee_id), same as before. The
// record-list sections below (Emergency Contacts, Dependents,
// Immigration, Salary, Report-to, Work Experience/Education,
// Memberships, and every Attachments block) are UI-only on local
// state for now — each would need its own table + Storage bucket
// (the same pattern already used for Documents/Recruitment resumes).
// Scoped out of this pass to keep it reviewable; not persisted yet.
const ME = {
  fullName: "You",
  employeeId: "EMP-003",
  otherId: "",
  driversLicense: "",
  licenseExpiry: "",
  jobTitle: "Website Coordinator",
  department: "Operations",
  employmentStatus: "Full-Time Permanent",
  dateJoined: "2023-04-10",
  jobCategory: "",
  subUnit: "Operations",
  location: "Head Office",
  reportsTo: "Jules Esparon",
  payGrade: "Grade 2",
  email: "you@vertexhrm.app",
  workPhone: "",
  homePhone: "",
  mobile: "",
  otherEmail: "",
  address: { street1: "", street2: "", city: "", state: "", zip: "", country: "" },
  nationality: "Seychellois",
  maritalStatus: "",
  dateOfBirth: "",
  gender: "",
  gopNumber: null as string | null
};

const inputCls = "w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand-500 disabled:bg-surface-subtle disabled:text-ink-muted";

const TABS = [
  { key: "personal", label: "Personal Details", icon: User },
  { key: "contact", label: "Contact Details", icon: Phone },
  { key: "emergency", label: "Emergency Contacts", icon: ShieldAlert },
  { key: "dependents", label: "Dependents", icon: Users2 },
  { key: "immigration", label: "Immigration", icon: Plane },
  { key: "job", label: "Job", icon: Briefcase },
  { key: "salary", label: "Salary", icon: Wallet },
  { key: "reportto", label: "Report-to", icon: UserCog },
  { key: "qualifications", label: "Qualifications", icon: GraduationCap },
  { key: "memberships", label: "Memberships", icon: Award }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MyInfoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [myPhotoUrl, setMyPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function resolveEmployeeId() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
      const employeeId = appUser?.employee_id ?? null;
      setMyEmployeeId(employeeId);
      if (!employeeId) return;
      const { data: employee } = await supabase.from("employees").select("full_name, photo_url").eq("id", employeeId).single();
      if (employee) {
        setMyName(employee.full_name);
        setMyPhotoUrl(employee.photo_url);
      }
    }
    resolveEmployeeId();
  }, []);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !myEmployeeId) return;
    setUploadingPhoto(true);
    const supabase = createClient();
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("employee-photos").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingPhoto(false);
      alert(`Photo upload failed: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
    await supabase.from("employees").update({ photo_url: data.publicUrl }).eq("id", myEmployeeId);
    setMyPhotoUrl(data.publicUrl);
    setUploadingPhoto(false);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">My Info</h1>
      <p className="mt-1 text-sm text-ink-muted">Your own profile — self-service.</p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="shrink-0 lg:w-64">
          <div className="rounded-card border border-surface-border bg-white p-5 text-center">
            <div className="group relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-xl font-medium text-white">
              {myPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myPhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (myName ?? ME.fullName).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
              )}
              <label
                htmlFor="my-photo"
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : "Change"}
              </label>
              <input id="my-photo" type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploadingPhoto} />
            </div>
            <p className="mt-3 font-display text-base font-medium text-ink">{myName ?? ME.fullName}</p>
            <label htmlFor="my-photo" className="mt-1 inline-block cursor-pointer text-xs font-medium text-brand-700 hover:underline">
              {myPhotoUrl ? "Change photo" : "Add a photo"}
            </label>
          </div>

          <nav className="mt-3 space-y-0.5 rounded-card border border-surface-border bg-white p-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  activeTab === key ? "bg-brand-50 font-medium text-brand-700" : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                )}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="max-w-3xl flex-1">
          {activeTab === "personal" && <PersonalDetailsTab />}
          {activeTab === "contact" && <ContactDetailsTab />}
          {activeTab === "emergency" && <EmergencyContactsTab />}
          {activeTab === "dependents" && <DependentsTab />}
          {activeTab === "immigration" && <ImmigrationTab />}
          {activeTab === "job" && <JobTab />}
          {activeTab === "salary" && <SalaryTab />}
          {activeTab === "reportto" && <ReportToTab />}
          {activeTab === "qualifications" && <QualificationsTab employeeId={myEmployeeId} />}
          {activeTab === "memberships" && <MembershipsTab employeeId={myEmployeeId} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Shared bits: a generic records table + an Attachments block, reused
// across most tabs below — matches the reference's consistent pattern
// of [Section header + Add] -> [table, "No Records Found" if empty].
// ---------------------------------------------------------------------
function SectionCard({
  title,
  onAdd,
  children
}: {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-surface-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-medium text-ink">{title}</h2>
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700">
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RecordsTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete
}: {
  columns: { key: keyof T; label: string }[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-soft">No Records Found</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            {columns.map((c) => <th key={String(c.key)} className="px-3 py-2">{c.label}</th>)}
            {(onEdit || onDelete) && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-surface-border">
              {columns.map((c) => <td key={String(c.key)} className="px-3 py-2 text-ink-muted">{String(row[c.key] ?? "—")}</td>)}
              {(onEdit || onDelete) && (
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {onEdit && <button onClick={() => onEdit(row)} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Pencil size={14} /></button>}
                    {onDelete && <button onClick={() => onDelete(row.id)} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={14} /></button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AttachmentRow { id: string; fileName: string; description: string; size: string; type: string; dateAdded: string }

function AttachmentsBlock() {
  const [files, setFiles] = useState<AttachmentRow[]>([]);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) return;
    setFiles((prev) => [...prev, {
      id: crypto.randomUUID(),
      fileName: file.name,
      description: String(form.get("description") ?? ""),
      size: `${(file.size / 1024).toFixed(2)} kB`,
      type: file.type || "unknown",
      dateAdded: new Date().toISOString().slice(0, 10)
    }]);
    setAdding(false);
  }

  return (
    <div className="mt-5 border-t border-surface-border pt-4">
      <SectionCard title="Attachments" onAdd={() => setAdding(true)}>
        {files.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">No Records Found</p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-surface-border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Paperclip size={14} className="text-ink-soft" />
                  <div>
                    <p className="text-ink">{f.fileName}</p>
                    <p className="text-xs text-ink-soft">{f.description} &middot; {f.size} &middot; {f.dateAdded}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-brand-700"><Download size={14} /></button>
                  <button onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} className="rounded-md p-1.5 text-ink-soft hover:bg-surface-subtle hover:text-state-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {adding && (
        <Modal title="Add attachment" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">File *</label><input name="file" type="file" required className="w-full text-sm" /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Description</label><input name="description" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Personal Details
// ---------------------------------------------------------------------
function PersonalDetailsTab() {
  return (
    <div className="rounded-card border border-surface-border bg-white p-6">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1 block text-sm font-medium text-ink">Employee Id</label><input disabled defaultValue={ME.employeeId} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Other Id</label><input disabled defaultValue={ME.otherId} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Driver&apos;s License Number</label><input disabled defaultValue={ME.driversLicense} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">License Expiry Date</label><input disabled type="date" defaultValue={ME.licenseExpiry} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Nationality</label><input disabled defaultValue={ME.nationality} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Marital Status</label><input disabled defaultValue={ME.maritalStatus} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Date of Birth</label><input disabled type="date" defaultValue={ME.dateOfBirth} className={inputCls} /></div>
        <div><label className="mb-1 block text-sm font-medium text-ink">Gender</label><input disabled defaultValue={ME.gender} className={inputCls} /></div>
      </div>
      <p className="mt-3 text-xs text-ink-soft">Personal details are set by HR — contact them for corrections.</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Contact Details
// ---------------------------------------------------------------------
function ContactDetailsTab() {
  const [saved, setSaved] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 1500); }} className="space-y-5">
      <div className="rounded-card border border-surface-border bg-white p-6">
        <h2 className="mb-3 font-display text-base font-medium text-ink">Address</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Street 1</label><input defaultValue={ME.address.street1} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Street 2</label><input defaultValue={ME.address.street2} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">City</label><input defaultValue={ME.address.city} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">State/Province</label><input defaultValue={ME.address.state} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Zip/Postal Code</label><input defaultValue={ME.address.zip} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Country</label><input defaultValue={ME.address.country} className={inputCls} /></div>
        </div>

        <h2 className="mb-3 mt-5 font-display text-base font-medium text-ink">Telephone</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Home</label><input defaultValue={ME.homePhone} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Mobile</label><input defaultValue={ME.mobile} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Work</label><input defaultValue={ME.workPhone} className={inputCls} /></div>
        </div>

        <h2 className="mb-3 mt-5 font-display text-base font-medium text-ink">Email</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Work Email</label><input defaultValue={ME.email} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Other Email</label><input defaultValue={ME.otherEmail} className={inputCls} /></div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
          {saved && <span className="text-sm text-state-success">Saved</span>}
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Emergency Contacts
// ---------------------------------------------------------------------
interface EmergencyContact { id: string; name: string; relationship: string; homeTelephone: string; mobile: string; workTelephone: string }

function EmergencyContactsTab() {
  const [rows, setRows] = useState<EmergencyContact[]>([]);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setRows((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: String(form.get("name")),
      relationship: String(form.get("relationship")),
      homeTelephone: String(form.get("homeTelephone")),
      mobile: String(form.get("mobile")),
      workTelephone: String(form.get("workTelephone"))
    }]);
    setAdding(false);
  }

  return (
    <div>
      <SectionCard title="Assigned Emergency Contacts" onAdd={() => setAdding(true)}>
        <RecordsTable
          columns={[
            { key: "name", label: "Name" },
            { key: "relationship", label: "Relationship" },
            { key: "homeTelephone", label: "Home Telephone" },
            { key: "mobile", label: "Mobile" },
            { key: "workTelephone", label: "Work Telephone" }
          ]}
          rows={rows}
          onDelete={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      </SectionCard>
      <AttachmentsBlock />

      {adding && (
        <Modal title="Add emergency contact" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Relationship</label><input name="relationship" className={inputCls} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Home</label><input name="homeTelephone" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Mobile</label><input name="mobile" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Work</label><input name="workTelephone" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Dependents
// ---------------------------------------------------------------------
interface DependentRow { id: string; name: string; relationship: string; dateOfBirth: string }

function DependentsTab() {
  const [rows, setRows] = useState<DependentRow[]>([]);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setRows((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: String(form.get("name")),
      relationship: String(form.get("relationship")),
      dateOfBirth: String(form.get("dateOfBirth"))
    }]);
    setAdding(false);
  }

  return (
    <div>
      <SectionCard title="Assigned Dependents" onAdd={() => setAdding(true)}>
        <RecordsTable
          columns={[{ key: "name", label: "Name" }, { key: "relationship", label: "Relationship" }, { key: "dateOfBirth", label: "Date of Birth" }]}
          rows={rows}
          onDelete={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      </SectionCard>
      <AttachmentsBlock />

      {adding && (
        <Modal title="Add dependent" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="name" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Relationship</label><input name="relationship" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Date of Birth</label><input name="dateOfBirth" type="date" className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Immigration
// ---------------------------------------------------------------------
interface ImmigrationDoc { id: string; document: string; number: string; issuedBy: string; issuedDate: string; expiryDate: string }

function ImmigrationTab() {
  const [rows, setRows] = useState<ImmigrationDoc[]>([]);
  const [adding, setAdding] = useState(false);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setRows((prev) => [...prev, {
      id: crypto.randomUUID(),
      document: String(form.get("document")),
      number: String(form.get("number")),
      issuedBy: String(form.get("issuedBy")),
      issuedDate: String(form.get("issuedDate")),
      expiryDate: String(form.get("expiryDate"))
    }]);
    setAdding(false);
  }

  return (
    <div>
      {ME.nationality === "Seychellois" && (
        <p className="mb-3 text-sm text-ink-muted">No work permit required — Seychellois nationals don&apos;t need a Gainful Occupation Permit.</p>
      )}
      <SectionCard title="Immigration Documents" onAdd={() => setAdding(true)}>
        <RecordsTable
          columns={[
            { key: "document", label: "Document" },
            { key: "number", label: "Number" },
            { key: "issuedBy", label: "Issued By" },
            { key: "issuedDate", label: "Issued Date" },
            { key: "expiryDate", label: "Expiry Date" }
          ]}
          rows={rows}
          onDelete={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      </SectionCard>
      <AttachmentsBlock />

      {adding && (
        <Modal title="Add immigration document" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Document *</label><input name="document" required placeholder="Passport, GOP, Visa..." className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Number</label><input name="number" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Issued By</label><input name="issuedBy" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Issued Date</label><input name="issuedDate" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Expiry Date</label><input name="expiryDate" type="date" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------
function JobTab() {
  const [showContract, setShowContract] = useState(false);
  return (
    <div>
      <div className="rounded-card border border-surface-border bg-white p-6">
        <h2 className="mb-3 font-display text-base font-medium text-ink">Job Details</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="mb-1 block text-sm font-medium text-ink">Joined Date</label><input disabled defaultValue={ME.dateJoined} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Job Title</label><input disabled defaultValue={ME.jobTitle} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Job Category</label><input disabled defaultValue={ME.jobCategory} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Sub Unit</label><input disabled defaultValue={ME.subUnit} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Location</label><input disabled defaultValue={ME.location} className={inputCls} /></div>
          <div><label className="mb-1 block text-sm font-medium text-ink">Employment Status</label><input disabled defaultValue={ME.employmentStatus} className={inputCls} /></div>
        </div>

        <label className="mt-5 flex items-center justify-between border-t border-surface-border pt-4 text-sm text-ink">
          Include Employment Contract Details
          <button
            type="button"
            role="switch"
            aria-checked={showContract}
            onClick={() => setShowContract((v) => !v)}
            className={clsx("h-5 w-9 rounded-full transition-colors", showContract ? "bg-brand-gradient" : "bg-surface-border")}
          >
            <span className={clsx("block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform", showContract ? "translate-x-4" : "translate-x-0.5")} />
          </button>
        </label>
        <p className="mt-3 text-xs text-ink-soft">Set by HR via PIM — not self-editable.</p>
      </div>
      <AttachmentsBlock />
    </div>
  );
}

// ---------------------------------------------------------------------
// Salary
// ---------------------------------------------------------------------
interface SalaryComponentRow { id: string; component: string; amount: string; currency: string; payFrequency: string; directDepositAmount: string }

function SalaryTab() {
  const [rows] = useState<SalaryComponentRow[]>([]);

  return (
    <div>
      <SectionCard title="Assigned Salary Components">
        <RecordsTable
          columns={[
            { key: "component", label: "Salary Component" },
            { key: "amount", label: "Amount" },
            { key: "currency", label: "Currency" },
            { key: "payFrequency", label: "Pay Frequency" },
            { key: "directDepositAmount", label: "Direct Deposit Amount" }
          ]}
          rows={rows}
        />
      </SectionCard>
      <p className="mt-2 text-xs text-ink-soft">Pay grade: {ME.payGrade}. Salary figures are entered by Finance/HR — not self-editable here.</p>
      <AttachmentsBlock />
    </div>
  );
}

// ---------------------------------------------------------------------
// Report-to
// ---------------------------------------------------------------------
interface ReportLine { id: string; name: string; reportingMethod: string }

function ReportToTab() {
  const supervisors: ReportLine[] = ME.reportsTo ? [{ id: "1", name: ME.reportsTo, reportingMethod: "Direct" }] : [];
  const subordinates: ReportLine[] = [];

  return (
    <div>
      <SectionCard title="Assigned Supervisors">
        <RecordsTable columns={[{ key: "name", label: "Name" }, { key: "reportingMethod", label: "Reporting Method" }]} rows={supervisors} />
      </SectionCard>
      <div className="mt-5">
        <SectionCard title="Assigned Subordinates">
          <RecordsTable columns={[{ key: "name", label: "Name" }, { key: "reportingMethod", label: "Reporting Method" }]} rows={subordinates} />
        </SectionCard>
      </div>
      <AttachmentsBlock />
    </div>
  );
}

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Qualifications — Work Experience, Education, Skills
// ---------------------------------------------------------------------
interface WorkExperienceRow { id: string; company: string; job_title: string | null; from_date: string | null; to_date: string | null; comment: string | null }
interface EducationRow { id: string; level: string; year: string | null; gpa: string | null }
interface SkillRow { id: string; skill_name: string; category: string; proficiency_level: string | null; issuing_body: string | null; issued_date: string | null; expiry_date: string | null }

function expiryBadge(expiry: string | null) {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return <span className="rounded-full bg-state-dangerBg px-2 py-0.5 text-[10px] font-medium text-state-danger">Expired</span>;
  if (days <= 30) return <span className="rounded-full bg-state-warningBg px-2 py-0.5 text-[10px] font-medium text-state-warning">Expires in {days}d</span>;
  return null;
}

function QualificationsTab({ employeeId }: { employeeId: string | null }) {
  const supabase = createClient();
  const [experience, setExperience] = useState<WorkExperienceRow[]>([]);
  const [education, setEducation] = useState<EducationRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [addingExp, setAddingExp] = useState(false);
  const [addingEdu, setAddingEdu] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);

  async function load() {
    if (!employeeId) return;
    const [expRes, eduRes, skillRes] = await Promise.all([
      supabase.from("employee_work_experience").select("id, company, job_title, from_date, to_date, comment").eq("employee_id", employeeId).order("from_date", { ascending: false }),
      supabase.from("employee_education").select("id, level, year, gpa").eq("employee_id", employeeId).order("year", { ascending: false }),
      supabase.from("employee_skills").select("id, skill_name, category, proficiency_level, issuing_body, issued_date, expiry_date").eq("employee_id", employeeId).order("skill_name")
    ]);
    setExperience(expRes.data ?? []);
    setEducation(eduRes.data ?? []);
    setSkills((skillRes.data as SkillRow[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [employeeId]);

  async function addExperience(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("employee_work_experience").insert({
      employee_id: employeeId, company: form.get("company"), job_title: form.get("jobTitle"),
      from_date: form.get("from") || null, to_date: form.get("to") || null, comment: form.get("comment")
    });
    setAddingExp(false);
    load();
  }

  async function addEducation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("employee_education").insert({ employee_id: employeeId, level: form.get("level"), year: form.get("year"), gpa: form.get("gpa") });
    setAddingEdu(false);
    load();
  }

  async function addSkill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("employee_skills").insert({
      employee_id: employeeId, skill_name: form.get("skillName"), category: form.get("category"),
      proficiency_level: form.get("proficiencyLevel") || null, issuing_body: form.get("issuingBody"),
      issued_date: form.get("issuedDate") || null, expiry_date: form.get("expiryDate") || null
    });
    setAddingSkill(false);
    load();
  }

  async function removeExperience(id: string) { await supabase.from("employee_work_experience").delete().eq("id", id); load(); }
  async function removeEducation(id: string) { await supabase.from("employee_education").delete().eq("id", id); load(); }
  async function removeSkill(id: string) { await supabase.from("employee_skills").delete().eq("id", id); load(); }

  return (
    <div className="space-y-5">
      <SectionCard title="Work Experience" onAdd={() => setAddingExp(true)}>
        <RecordsTable
          columns={[{ key: "company", label: "Company" }, { key: "job_title", label: "Job Title" }, { key: "from_date", label: "From" }, { key: "to_date", label: "To" }, { key: "comment", label: "Comment" }]}
          rows={experience}
          onDelete={removeExperience}
        />
      </SectionCard>

      <SectionCard title="Education" onAdd={() => setAddingEdu(true)}>
        <RecordsTable
          columns={[{ key: "level", label: "Level" }, { key: "year", label: "Year" }, { key: "gpa", label: "GPA/Score" }]}
          rows={education}
          onDelete={removeEducation}
        />
      </SectionCard>

      <SectionCard title="Skills, Languages &amp; Certifications" onAdd={() => setAddingSkill(true)}>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {s.skill_name}
              {s.category !== "Skill" && <span className="text-[10px] text-brand-700/70">({s.category}{s.proficiency_level ? `, ${s.proficiency_level}` : ""})</span>}
              {expiryBadge(s.expiry_date)}
              <button onClick={() => removeSkill(s.id)} className="text-brand-700/60 hover:text-brand-700"><Trash2 size={11} /></button>
            </span>
          ))}
          {skills.length === 0 && <p className="text-sm text-ink-soft">No Records Found</p>}
        </div>
      </SectionCard>

      <AttachmentsBlock />

      {addingExp && (
        <Modal title="Add work experience" onClose={() => setAddingExp(false)}>
          <form onSubmit={addExperience} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Company *</label><input name="company" required className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Job Title</label><input name="jobTitle" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">From</label><input name="from" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">To</label><input name="to" type="date" className={inputCls} /></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Comment</label><textarea name="comment" rows={2} className={inputCls} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingExp(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingEdu && (
        <Modal title="Add education" onClose={() => setAddingEdu(false)}>
          <form onSubmit={addEducation} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Level *</label><input name="level" required placeholder="Bachelor's Degree" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Year</label><input name="year" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">GPA/Score</label><input name="gpa" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingEdu(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {addingSkill && (
        <Modal title="Add skill, language, or certification" onClose={() => setAddingSkill(false)}>
          <form onSubmit={addSkill} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Name *</label><input name="skillName" required placeholder="e.g. First Aid Certificate" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Category *</label><select name="category" required defaultValue="Skill" className={inputCls}><option value="Skill">Skill</option><option value="Language">Language</option><option value="Certification">Certification</option><option value="License">License</option></select></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Proficiency</label><select name="proficiencyLevel" defaultValue="" className={inputCls}><option value="">—</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option><option value="Expert">Expert</option></select></div>
            </div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Issuing Body</label><input name="issuingBody" placeholder="Only relevant for certifications/licenses" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Issued</label><input name="issuedDate" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Expires</label><input name="expiryDate" type="date" className={inputCls} /></div>
            </div>
            <p className="text-xs text-ink-soft">Expiry date drives the expiring-soon flag shown here and on PIM &rarr; Reports &rarr; Expiring Qualifications.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAddingSkill(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------
interface MembershipRow { id: string; membership: string; subscriptionPaidBy: string; subscriptionAmount: string; currency: string; commenceDate: string; renewalDate: string }

function MembershipsTab({ employeeId }: { employeeId: string | null }) {
  const supabase = createClient();
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [adding, setAdding] = useState(false);

  async function load() {
    if (!employeeId) return;
    const { data } = await supabase
      .from("employee_memberships")
      .select("id, membership_name, subscription_paid_by, subscription_amount, currency, commence_date, renewal_date")
      .eq("employee_id", employeeId)
      .order("membership_name");
    setRows(
      (data ?? []).map((r) => ({
        id: r.id, membership: r.membership_name, subscriptionPaidBy: r.subscription_paid_by ?? "",
        subscriptionAmount: r.subscription_amount != null ? String(r.subscription_amount) : "",
        currency: r.currency ?? "", commenceDate: r.commence_date ?? "", renewalDate: r.renewal_date ?? ""
      }))
    );
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [employeeId]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("employee_memberships").insert({
      employee_id: employeeId, membership_name: form.get("membership"), subscription_paid_by: form.get("subscriptionPaidBy"),
      subscription_amount: form.get("subscriptionAmount") ? Number(form.get("subscriptionAmount")) : null,
      currency: form.get("currency"), commence_date: form.get("commenceDate") || null, renewal_date: form.get("renewalDate") || null
    });
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("employee_memberships").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <SectionCard title="Assigned Memberships" onAdd={() => setAdding(true)}>
        <RecordsTable
          columns={[
            { key: "membership", label: "Membership" },
            { key: "subscriptionPaidBy", label: "Subscription Paid By" },
            { key: "subscriptionAmount", label: "Subscription Amount" },
            { key: "currency", label: "Currency" },
            { key: "commenceDate", label: "Commence Date" },
            { key: "renewalDate", label: "Renewal Date" }
          ]}
          rows={rows}
          onDelete={remove}
        />
      </SectionCard>
      <AttachmentsBlock />

      {adding && (
        <Modal title="Add membership" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-ink">Membership *</label><input name="membership" required placeholder="e.g. ACCA" className={inputCls} /></div>
            <div><label className="mb-1 block text-sm font-medium text-ink">Subscription Paid By</label><input name="subscriptionPaidBy" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Amount</label><input name="subscriptionAmount" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Currency</label><input name="currency" defaultValue="SCR" className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-sm font-medium text-ink">Commence Date</label><input name="commenceDate" type="date" className={inputCls} /></div>
              <div><label className="mb-1 block text-sm font-medium text-ink">Renewal Date</label><input name="renewalDate" type="date" className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">Cancel</button>
              <button type="submit" className="rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

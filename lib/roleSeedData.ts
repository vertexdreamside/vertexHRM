// AUTO-GENERATED seed data — regenerate via gen_permissions.py if the
// access matrix in the Access Levels doc changes. Do not hand-edit the
// ROLE_SEED permissions block below; edit the source script instead.
import type { ModulePermission } from "./types";

export const MODULES: { key: string; label: string }[] = [
  { key: "system_config", label: "System Config / Roles / Branding" },
  { key: "audit_log", label: "Audit Log" },
  { key: "employees", label: "Employees / Job / Pay Grades" },
  { key: "organization", label: "Organization" },
  { key: "leave", label: "Leave" },
  // Manually added (not part of the generator run) — the Admin Ops
  // "front door" permission from migration 0035. Sits above the
  // existing documents/requests/procurement/etc. rows: this is
  // whether a role can enter the Admin Ops space at all; those rows
  // still govern what they see once inside.
  { key: "admin_ops", label: "Admin Operations (space access)" },
  { key: "documents", label: "Documents" },
  { key: "requests", label: "Requests" },
  { key: "procurement", label: "Procurement" },
  { key: "it_support", label: "IT Support" },
  { key: "assets", label: "Assets" },
  { key: "inventory", label: "Inventory" },
  { key: "expenses", label: "Expenses" },
  { key: "budgets", label: "Budgets & Cost Centers" },
  { key: "calendar", label: "Calendar" },
  { key: "communication", label: "Communication" },
  { key: "reports", label: "Reports" },
];

export interface AppRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: Record<string, ModulePermission>;
}

export const ROLE_SEED: AppRole[] = [
  {
    id: "1",
    name: "System Administrator",
    description: "Full access, all modules, both systems.",
    isSystem: true,
    userCount: 1,
    permissions: {"system_config": {view: true, add: true, edit: true, delete: true, approve: false}, "audit_log": {view: true, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: true, edit: true, delete: true, approve: false}, "organization": {view: true, add: true, edit: true, delete: true, approve: false}, "leave": {view: true, add: true, edit: true, delete: true, approve: false}, "documents": {view: true, add: true, edit: true, delete: true, approve: false}, "requests": {view: true, add: true, edit: true, delete: true, approve: false}, "procurement": {view: true, add: true, edit: true, delete: true, approve: false}, "it_support": {view: true, add: true, edit: true, delete: true, approve: false}, "assets": {view: true, add: true, edit: true, delete: true, approve: false}, "inventory": {view: true, add: true, edit: true, delete: true, approve: false}, "expenses": {view: true, add: true, edit: true, delete: true, approve: false}, "budgets": {view: true, add: true, edit: true, delete: true, approve: false}, "calendar": {view: true, add: true, edit: true, delete: true, approve: false}, "communication": {view: true, add: true, edit: true, delete: true, approve: false}, "reports": {view: true, add: true, edit: true, delete: true, approve: false}},
  },
  {
    id: "2",
    name: "HR Manager",
    description: "Full access to HRM; view-only elsewhere.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: true, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: true, edit: true, delete: true, approve: false}, "organization": {view: true, add: true, edit: true, delete: false, approve: false}, "leave": {view: true, add: true, edit: true, delete: true, approve: false}, "documents": {view: true, add: true, edit: true, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: false}, "procurement": {view: false, add: false, edit: false, delete: false, approve: false}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: false}, "budgets": {view: true, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: true, edit: true, delete: false, approve: false}, "reports": {view: true, add: true, edit: true, delete: true, approve: false}},
  },
  {
    id: "3",
    name: "HR Officer",
    description: "Edit access to HRM records; cannot change system config.",
    isSystem: false,
    userCount: 2,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: true, edit: true, delete: false, approve: false}, "organization": {view: true, add: false, edit: false, delete: false, approve: false}, "leave": {view: true, add: true, edit: true, delete: false, approve: false}, "documents": {view: true, add: true, edit: true, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: false}, "procurement": {view: false, add: false, edit: false, delete: false, approve: false}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: false, add: false, edit: false, delete: false, approve: false}, "budgets": {view: false, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "4",
    name: "Department Manager",
    description: "Approves for their department; views their team's data.",
    isSystem: false,
    userCount: 4,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: true, add: false, edit: false, delete: false, approve: true}, "documents": {view: true, add: true, edit: true, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: true}, "procurement": {view: true, add: false, edit: false, delete: false, approve: true}, "it_support": {view: true, add: false, edit: false, delete: false, approve: false}, "assets": {view: true, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: true}, "budgets": {view: true, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "5",
    name: "Supervisor",
    description: "Approves for a smaller team, usually with lower monetary limits.",
    isSystem: false,
    userCount: 3,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: true, add: false, edit: false, delete: false, approve: true}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: true}, "procurement": {view: true, add: false, edit: false, delete: false, approve: true}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: true}, "budgets": {view: false, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "6",
    name: "IT Officer",
    description: "Full access to IT Support & Assets; no HR data.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: false, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: false, add: false, edit: false, delete: false, approve: false}, "procurement": {view: false, add: false, edit: false, delete: false, approve: false}, "it_support": {view: true, add: true, edit: true, delete: true, approve: false}, "assets": {view: true, add: true, edit: true, delete: true, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: false, add: false, edit: false, delete: false, approve: false}, "budgets": {view: false, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "7",
    name: "Procurement Officer",
    description: "Full access to Procurement & Inventory.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: false, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: false, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: false, add: false, edit: false, delete: false, approve: false}, "procurement": {view: true, add: true, edit: true, delete: true, approve: false}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: true, add: true, edit: true, delete: true, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: false}, "budgets": {view: true, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "8",
    name: "Finance Officer",
    description: "Full access to Expenses & Budgets; view-only elsewhere.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: false, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: false, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: false, add: false, edit: false, delete: false, approve: false}, "procurement": {view: true, add: false, edit: false, delete: false, approve: false}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: true, edit: true, delete: true, approve: false}, "budgets": {view: true, add: true, edit: true, delete: true, approve: false}, "calendar": {view: true, add: true, edit: true, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: true, edit: true, delete: true, approve: false}},
  },
  {
    id: "9",
    name: "Office Administrator",
    description: "Manages Documents, Communication, Calendar, incoming Requests.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: false, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: true, edit: true, delete: true, approve: false}, "requests": {view: true, add: true, edit: true, delete: false, approve: false}, "procurement": {view: false, add: false, edit: false, delete: false, approve: false}, "it_support": {view: false, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: false, add: false, edit: false, delete: false, approve: false}, "budgets": {view: false, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: true, edit: true, delete: true, approve: false}, "communication": {view: true, add: true, edit: true, delete: true, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "10",
    name: "Employee",
    description: "Self-service only — own records and submissions.",
    isSystem: true,
    userCount: 22,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: false, add: false, edit: false, delete: false, approve: false}, "employees": {view: false, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: true, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: false}, "procurement": {view: false, add: false, edit: false, delete: false, approve: false}, "it_support": {view: true, add: false, edit: false, delete: false, approve: false}, "assets": {view: false, add: false, edit: false, delete: false, approve: false}, "inventory": {view: false, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: false}, "budgets": {view: false, add: false, edit: false, delete: false, approve: false}, "calendar": {view: true, add: false, edit: false, delete: false, approve: false}, "communication": {view: true, add: false, edit: false, delete: false, approve: false}, "reports": {view: false, add: false, edit: false, delete: false, approve: false}},
  },
  {
    id: "11",
    name: "Auditor",
    description: "View-only across Audit Log and Reports; no edit rights anywhere.",
    isSystem: false,
    userCount: 1,
    permissions: {"system_config": {view: false, add: false, edit: false, delete: false, approve: false}, "audit_log": {view: true, add: false, edit: false, delete: false, approve: false}, "employees": {view: true, add: false, edit: false, delete: false, approve: false}, "organization": {view: false, add: false, edit: false, delete: false, approve: false}, "leave": {view: true, add: false, edit: false, delete: false, approve: false}, "documents": {view: true, add: false, edit: false, delete: false, approve: false}, "requests": {view: true, add: false, edit: false, delete: false, approve: false}, "procurement": {view: true, add: false, edit: false, delete: false, approve: false}, "it_support": {view: true, add: false, edit: false, delete: false, approve: false}, "assets": {view: true, add: false, edit: false, delete: false, approve: false}, "inventory": {view: true, add: false, edit: false, delete: false, approve: false}, "expenses": {view: true, add: false, edit: false, delete: false, approve: false}, "budgets": {view: true, add: false, edit: false, delete: false, approve: false}, "calendar": {view: false, add: false, edit: false, delete: false, approve: false}, "communication": {view: false, add: false, edit: false, delete: false, approve: false}, "reports": {view: true, add: false, edit: false, delete: false, approve: false}},
  },
];

// Mirrors the "Shared Platform Layer" entities from the
// Vertex Suite — Core Data Model reference doc.

export type UserStatus = "enabled" | "disabled";

export type Role =
  | "System Administrator"
  | "HR Manager"
  | "HR Officer"
  | "Department Manager"
  | "Supervisor"
  | "IT Officer"
  | "Procurement Officer"
  | "Finance Officer"
  | "Office Administrator"
  | "Employee"
  | "Auditor";

export interface AppUser {
  id: string;
  username: string;
  employeeName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface OrgLocation {
  id: string;
  name: string;
  country: string;
  island: string;
  phone: string;
  address: string;
}

export interface OrgUnit {
  id: string;
  unitId: string;
  name: string;
  description: string;
  parentId: string | null;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  recurring: boolean;
  appliesTo: "all" | string; // "all" or a location id
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface JobTitle {
  id: string;
  title: string;
  description: string;
  specFileName: string | null;
  notes: string;
}

export interface PayGrade {
  id: string;
  name: string;
  currencyCode: string;
  minSalary: number;
  maxSalary: number;
}

export interface EmploymentStatus {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

export interface JobCategory {
  id: string;
  name: string;
}

export interface WorkShift {
  id: string;
  name: string;
  from: string; // HH:MM
  to: string; // HH:MM
}

export type QualificationListType =
  | "skills"
  | "education"
  | "certificates"
  | "languages"
  | "memberships"
  | "nationalities";

export interface QualificationItem {
  id: string;
  name: string;
  description?: string;
}

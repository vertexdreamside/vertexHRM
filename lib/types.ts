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

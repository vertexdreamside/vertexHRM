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

export interface BrandingSettings {
  primaryColor: string; // gradient start — spec's "Primary Color *"
  primaryFontColor: string; // spec's "Primary Font Color *"
  primaryGradientColor1: string; // gradient end — spec's "Primary Gradient Color 1 *"
  logoUrl: string | null;
  loginBannerUrl: string | null;
  socialPreviewEnabled: boolean;
}

// ---- §5 Configuration ----

export interface EmailConfig {
  mailSentAs: string;
  sendingMethod: "secure_smtp" | "smtp" | "sendmail";
  pathToSendmail: string;
}

export interface EmailSubscription {
  id: string;
  notificationType: string;
  subscriberCount: number;
}

export interface ModuleToggle {
  key: string;
  name: string;
  enabled: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  expiryDays: number;
  lockoutAttempts: number;
  lockoutMinutes: number;
  require2fa: boolean;
  sessionTimeoutMinutes: number;
  adminIpAllowlist: string;
}

export interface CustomField {
  id: string;
  label: string;
  appliesTo: "Employee" | "Job Title";
  fieldType: "Text" | "Number" | "Date" | "Dropdown" | "Checkbox" | "File";
  required: boolean;
}

export interface ActiveSession {
  id: string;
  username: string;
  device: string;
  ipAddress: string;
  loginTime: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
}

export interface TosDocument {
  id: string;
  type: "Terms of Service" | "Privacy Policy" | "Employee Data Consent Notice";
  version: number;
  effectiveDate: string;
  requireReacceptance: boolean;
}

export interface SocialAuthProvider {
  id: string;
  name: string;
  clientId: string;
  providerUrl: string;
}

// ---- §6 Compliance ----

export interface DataRetentionRule {
  id: string;
  dataCategory: string;
  retentionYears: number;
  actionAfterExpiry: "Archive" | "Anonymize" | "Delete";
}

export interface DataSubjectRequest {
  id: string;
  employeeName: string;
  requestType: "Access" | "Rectify" | "Erase" | "Port";
  status: "Received" | "In Progress" | "Completed" | "Rejected";
  dueDate: string;
}

export interface LeaveTypeDefault {
  id: string;
  name: string;
  statutoryMinimumDays: number;
  currentDays: number;
  notes: string;
}

export interface WorkPermit {
  id: string;
  employeeName: string;
  nationality: string;
  gopNumber: string;
  expiryDate: string;
  status: "Valid" | "Pending Renewal" | "Expired";
}

// ---- Directory ----

export interface DirectoryEmployee {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  location: string;
  email: string;
  phone: string;
  photoUrl: string | null;
}

// ---- Dashboard ----

export interface MyAction {
  id: string;
  text: string;
  status: "pending" | "in_progress" | "completed";
}

export interface EmployeeOnLeaveToday {
  id: string;
  name: string;
  leaveType: string;
}

export interface DistributionSlice {
  name: string;
  value: number;
}

// ---- PIM ----

export interface PimEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "";
  maritalStatus: "Single" | "Married" | "Other" | "";
  nationality: string;
  jobTitle: string;
  department: string;
  employmentStatus: string;
  dateJoined: string;
  status: "Active" | "Inactive";
  email: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

// ---- Leave ----

export type LeaveRequestStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveBalance {
  leaveType: string;
  entitledDays: number;
  usedDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: LeaveRequestStatus;
  reason: string;
  submittedDate: string;
}

// ---- Time ----

export type TimesheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export interface TimesheetProject {
  id: string;
  name: string;
}

export interface Timesheet {
  id: string;
  employeeName: string;
  weekStarting: string; // YYYY-MM-DD, a Monday
  status: TimesheetStatus;
  entries: Record<string, Record<string, number>>; // projectId -> day (Mon..Sun) -> hours
}

// ---- Recruitment ----

export type VacancyStatus = "Open" | "Closed";

export interface Vacancy {
  id: string;
  jobTitle: string;
  vacancyName: string;
  numberOfPositions: number;
  hiringManager: string;
  status: VacancyStatus;
}

export type CandidateStage =
  | "Application Received"
  | "Screening"
  | "Interview Scheduled"
  | "Interviewed"
  | "Offer Extended"
  | "Hired"
  | "Rejected";

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  vacancyId: string;
  stage: CandidateStage;
  appliedDate: string;
  resumeFileName: string | null;
}

// ---- Performance ----

export interface PerformanceKpi {
  id: string;
  jobTitle: string;
  kpiName: string;
  weight: number; // percent
}

export type ReviewStatus = "Draft" | "In Progress" | "Completed";

export interface PerformanceReview {
  id: string;
  employeeName: string;
  reviewer: string;
  reviewPeriod: string;
  status: ReviewStatus;
  overallRating: number | null; // 1-5, null until completed
}

// ---- Claims ----

export type ClaimStatus = "Initiated" | "Submitted" | "Approved" | "Rejected" | "Cancelled";

export interface ClaimEvent {
  id: string;
  name: string;
  active: boolean;
}

export interface ClaimExpenseType {
  id: string;
  name: string;
  active: boolean;
}

export interface ClaimExpenseLine {
  id: string;
  expenseTypeId: string;
  date: string;
  amount: number;
  note: string;
}

export interface Claim {
  id: string;
  referenceId: string;
  employeeName: string;
  eventId: string;
  currency: string;
  status: ClaimStatus;
  remarks: string;
  expenses: ClaimExpenseLine[];
  submittedDate: string;
}

// ---- Buzz ----

export interface BuzzPost {
  id: string;
  authorName: string;
  text: string;
  postedAt: string;
  likes: number;
  likedByMe: boolean;
  comments: BuzzComment[];
}

export interface BuzzComment {
  id: string;
  authorName: string;
  text: string;
}

export interface UpcomingAnniversary {
  id: string;
  employeeName: string;
  date: string;
  years: number;
}

// ---- My Info (self-service) ----

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
}

// ---- PIM Configuration ----

export interface OptionalField {
  key: string;
  label: string;
  visible: boolean;
}

export interface ReportingMethod {
  id: string;
  name: string;
}

export interface TerminationReason {
  id: string;
  name: string;
}

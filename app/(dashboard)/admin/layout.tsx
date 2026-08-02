import { SubNav, type SubNavItem } from "@/components/layout/SubNav";

const ADMIN_NAV: SubNavItem[] = [
  {
    label: "User Management",
    href: "/admin/users",
    dropdown: [
      { label: "System Users", href: "/admin/users" },
      { label: "User Roles", href: "/admin/roles" }
    ]
  },
  {
    label: "Job",
    href: "/admin/job-section",
    dropdown: [
      { label: "Job Titles", href: "/admin/job-section?tab=titles" },
      { label: "Pay Grades", href: "/admin/job-section?tab=grades" },
      { label: "Employment Status", href: "/admin/job-section?tab=status" },
      { label: "Job Categories", href: "/admin/job-section?tab=categories" },
      { label: "Work Shifts", href: "/admin/job-section?tab=shifts" }
    ]
  },
  {
    label: "Organization",
    href: "/admin/organization",
    dropdown: [
      { label: "General Information", href: "/admin/organization?tab=general" },
      { label: "Locations", href: "/admin/organization?tab=locations" },
      { label: "Structure", href: "/admin/organization?tab=structure" },
      { label: "Holiday Calendar", href: "/admin/organization?tab=holidays" }
    ]
  },
  {
    label: "Qualifications",
    href: "/admin/qualifications",
    dropdown: [
      { label: "Skills", href: "/admin/qualifications?tab=skills" },
      { label: "Education", href: "/admin/qualifications?tab=education" },
      { label: "Certificates", href: "/admin/qualifications?tab=certificates" },
      { label: "Languages", href: "/admin/qualifications?tab=languages" },
      { label: "Memberships", href: "/admin/qualifications?tab=memberships" }
    ]
  },
  { label: "Nationalities", href: "/admin/qualifications?tab=nationalities" },
  { label: "Corporate Branding", href: "/admin/branding" },
  { label: "Configuration", href: "/admin/configuration" },
  { label: "Compliance", href: "/admin/compliance" }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={ADMIN_NAV} />
      {children}
    </div>
  );
}

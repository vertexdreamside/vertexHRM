import { SubNav, type SubNavItem } from "@/components/layout/SubNav";

// Flat — each pill links to that section's own page, which shows its
// sub-sections as its own internal tab row (Job Section, Organization,
// and Qualifications all already have one) rather than a dropdown
// living here on top of it.
const ADMIN_NAV: SubNavItem[] = [
  { label: "System Users", href: "/admin/users" },
  { label: "User Roles", href: "/admin/roles" },
  { label: "Job", href: "/admin/job-section" },
  { label: "Organization", href: "/admin/organization" },
  { label: "Qualifications", href: "/admin/qualifications" },
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

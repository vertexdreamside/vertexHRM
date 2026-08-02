import { SubNav, type SubNavItem } from "@/components/layout/SubNav";

const PIM_NAV: SubNavItem[] = [
  {
    label: "Configuration",
    href: "/pim/configuration",
    dropdown: [
      { label: "Optional Fields", href: "/pim/configuration?tab=optionalfields" },
      { label: "Custom Fields", href: "/pim/configuration?tab=customfields" },
      { label: "Data Import", href: "/pim/configuration?tab=dataimport" },
      { label: "Reporting Methods", href: "/pim/configuration?tab=reportingmethods" },
      { label: "Termination Reasons", href: "/pim/configuration?tab=terminationreasons" }
    ]
  },
  { label: "Employee List", href: "/pim" },
  { label: "Add Employee", href: "/pim?new=1" },
  { label: "Reports", href: "/pim/reports" }
];

export default function PimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={PIM_NAV} />
      {children}
    </div>
  );
}

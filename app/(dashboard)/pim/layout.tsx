import { SubNav, type SubNavItem } from "@/components/layout/SubNav";

const PIM_NAV: SubNavItem[] = [
  { label: "Configuration", href: "/pim/configuration" },
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

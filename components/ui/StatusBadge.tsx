import { clsx } from "clsx";
import type { UserStatus } from "@/lib/types";

const STYLES: Record<UserStatus, string> = {
  enabled: "bg-state-successBg text-state-success",
  disabled: "bg-state-dangerBg text-state-danger"
};

const LABELS: Record<UserStatus, string> = {
  enabled: "Enabled",
  disabled: "Disabled"
};

export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}

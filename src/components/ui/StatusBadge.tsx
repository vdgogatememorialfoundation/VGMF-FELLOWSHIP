import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        getStatusColor(status)
      )}
    >
      {label ?? getStatusLabel(status)}
    </span>
  );
}

import { cn } from "@/lib/utils";

const DOC_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  RESUBMIT_REQUIRED: "bg-orange-100 text-orange-800",
};

export function DocStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        DOC_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

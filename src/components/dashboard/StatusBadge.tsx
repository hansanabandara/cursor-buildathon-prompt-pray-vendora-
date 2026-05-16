import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@/lib/actions/campaigns";

const styles: Record<CampaignStatus, string> = {
  draft:
    "border-muted-foreground/30 bg-muted text-muted-foreground",
  processing:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed:
    "border-destructive/30 bg-destructive/10 text-destructive",
};

const labels: Record<CampaignStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

import { ImageIcon } from "lucide-react";

import type { Campaign } from "@/lib/actions/campaigns";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const createdAt = new Date(campaign.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div className="group overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {campaign.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.thumbnail_url}
            alt={campaign.product_name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      <div className="space-y-1 p-4">
        <h3 className="truncate text-base font-semibold leading-tight">
          {campaign.name}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {campaign.product_name}
        </p>
        <p className="pt-2 text-xs text-muted-foreground">
          Created {createdAt}
        </p>
      </div>
    </div>
  );
}

import type { Campaign } from "@/lib/actions/campaigns";
import { CampaignCard } from "@/components/dashboard/CampaignCard";

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}

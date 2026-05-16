import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { getCampaign, refreshCampaignUrls } from "@/lib/actions/studio";
import { getCampaignVideos } from "@/lib/actions/video";

export const metadata = {
  title: "Edit campaign · Vendora",
};

export default async function StudioEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getCampaign(id);
  if (!found) notFound();

  const campaign = await refreshCampaignUrls(found);

  const videos = campaign.result_image_url
    ? await getCampaignVideos(campaign.id)
    : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gradient">
          {campaign.product_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tweak the inputs and re-run the workflow, or jump straight to media
          creation below.
        </p>
      </div>

      <StudioWorkspace initialCampaign={campaign} initialVideos={videos} />
    </div>
  );
}

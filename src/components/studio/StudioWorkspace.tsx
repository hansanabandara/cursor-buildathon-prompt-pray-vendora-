"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { StudioForm } from "@/components/studio/StudioForm";
import { MediaCreationPanel } from "@/components/studio/MediaCreationPanel";
import type { Campaign } from "@/lib/actions/campaigns";
import type { CampaignVideo } from "@/lib/actions/video";

type Props = {
  initialCampaign?: Campaign | null;
  initialVideos?: CampaignVideo[];
};

export function StudioWorkspace({
  initialCampaign = null,
  initialVideos = [],
}: Props) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(
    initialCampaign
  );

  // Videos are server-fetched on initial load (edit page).
  // After an inline generation we start with [] — the gallery will populate
  // after router.refresh() fires inside VideoForm.
  const [videos] = useState<CampaignVideo[]>(initialVideos);

  const showMedia = Boolean(activeCampaign?.result_image_url);

  return (
    <div className="space-y-10">
      <StudioForm
        campaign={activeCampaign}
        onGenerated={setActiveCampaign}
      />

      <AnimatePresence>
        {showMedia && activeCampaign ? (
          <motion.div
            key={`media-${activeCampaign.id}`}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MediaCreationPanel
              campaignId={activeCampaign.id}
              videos={videos}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { StudioForm } from "@/components/studio/StudioForm";
import { MediaCreationPanel } from "@/components/studio/MediaCreationPanel";
import type { Campaign } from "@/lib/actions/campaigns";
import type { CampaignArtifactRow } from "@/lib/actions/campaignArtifacts";
import type { CampaignVideo } from "@/lib/actions/video";

/** Stable fallback — avoid `props = []` which allocates a fresh array each render. */
const EMPTY_VIDEO: CampaignVideo[] = [];
const EMPTY_ARTIFACT: CampaignArtifactRow[] = [];

type Props = {
  initialCampaign?: Campaign | null;
  initialVideos?: CampaignVideo[];
  initialPosters?: CampaignArtifactRow[];
  initialModels3d?: CampaignArtifactRow[];
};

export function StudioWorkspace({
  initialCampaign = null,
  initialVideos,
  initialPosters,
  initialModels3d,
}: Props) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(
    initialCampaign
  );

  // Keep client state aligned with server props.
  //
  // Without this sync, the panel would unmount/disappear in two cases:
  //   1. `router.refresh()` after a media generation streams new props from the
  //      server, but `useState` ignores the new `initialCampaign` reference.
  //   2. A Next.js re-signed `result_image_url` arrives from `refreshCampaignUrls`
  //      and we'd otherwise keep showing the stale (potentially expired) URL.
  //
  // We compare on `id` + `result_image_url`. If a fresher snapshot arrives we
  // adopt it. We never overwrite a campaign that *has* a result with one that
  // doesn't (that's how the section was vanishing for a sec on edit pages).
  const lastInitialRef = useRef<Campaign | null>(initialCampaign);
  useEffect(() => {
    const next = initialCampaign;
    const prev = lastInitialRef.current;
    lastInitialRef.current = next;

    setActiveCampaign((current) => {
      if (!current) return next;
      if (!next) return current;
      if (next.id !== current.id) return next;

      const sameResult =
        next.result_image_url === current.result_image_url &&
        next.thumbnail_url === current.thumbnail_url;

      if (sameResult && prev?.result_image_url === next.result_image_url) {
        return current;
      }

      return {
        ...current,
        ...next,
        // Never regress to a falsy hero — keeps the media panel on screen.
        result_image_url:
          next.result_image_url ?? current.result_image_url,
        thumbnail_url: next.thumbnail_url ?? current.thumbnail_url,
      };
    });
  }, [initialCampaign]);

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
              heroImageUrl={activeCampaign.result_image_url ?? null}
              videos={initialVideos ?? EMPTY_VIDEO}
              posters={initialPosters ?? EMPTY_ARTIFACT}
              models3d={initialModels3d ?? EMPTY_ARTIFACT}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

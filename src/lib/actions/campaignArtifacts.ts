"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "campaign-media";
const SIGNED_URL_TTL = 60 * 60; // mirrored assets — callers re-sign via getCampaignArtifacts

export type ArtifactKind =
  | "poster"
  | "model_3d"
  | "video"
  | "source"
  | "refined"
  | "variant";

/** Latest-first campaign_media rows filtered by kinds. */
export async function getCampaignArtifacts(
  campaignId: string,
  kinds: ArtifactKind[]
): Promise<CampaignArtifactRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("campaign_media")
    .select("*")
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .in("kind", kinds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const rows = data as CampaignArtifactRow[];

  for (const row of rows) {
    if (!row.storage_path) continue;
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL);
    if (signed?.signedUrl) row.url = signed.signedUrl;
  }
  return rows;
}

/** Used by Studio client shells to hydrate poster + Dress-3D rows on `/studio` (no SSR campaign id bundle). */
export async function fetchPosterAndModelArtifacts(campaignId: string): Promise<{
  posters: CampaignArtifactRow[];
  models3d: CampaignArtifactRow[];
}> {
  const [posters, models3d] = await Promise.all([
    getCampaignArtifacts(campaignId, ["poster"]),
    getCampaignArtifacts(campaignId, ["model_3d"]),
  ]);
  return { posters, models3d };
}

export type CampaignArtifactRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  kind: string;
  url: string;
  storage_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

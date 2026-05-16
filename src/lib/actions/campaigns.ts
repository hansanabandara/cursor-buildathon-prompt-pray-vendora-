"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type {
  AspectRatio,
  Background,
  CameraAngle,
  Lighting,
  Resolution,
  Style,
} from "@/lib/studio/types";

const BUCKET = "campaign-media";

export type CampaignStatus =
  | "draft"
  | "processing"
  | "completed"
  | "failed";

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  product_name: string;
  status: CampaignStatus;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;

  source_image_url: string | null;
  result_image_url: string | null;
  style: Style | null;
  background: Background | null;
  lighting: Lighting | null;
  custom_style: string | null;
  custom_background: string | null;
  custom_lighting: string | null;
  prompt: string | null;
  fal_request_id: string | null;
  error_message: string | null;

  aspect_ratio: AspectRatio | null;
  resolution: Resolution | null;
  enable_web_search: boolean;

  remove_other_text: boolean;
  camera_angle: CameraAngle | null;
  custom_camera_angle: string | null;
};

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Surface DB errors instead of silently returning [] — this hides bugs
    // like RLS / grant misconfiguration behind an empty dashboard.
    console.error("Failed to fetch campaigns:", error);
    throw new Error(
      `Could not load campaigns: ${error.message}. ` +
        "Make sure both SQL migrations have been applied and your Supabase " +
        "anon / publishable key is correct."
    );
  }

  return (data ?? []) as Campaign[];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type MutationState = {
  error?: string;
  success?: boolean;
};

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty.")
    .max(120, "Name is too long."),
});

/**
 * Rename a campaign. Updates both `name` (dashboard display) and
 * `product_name` (used in prompt composition) so the next regeneration
 * picks up the new product naming as well.
 */
export async function renameCampaign(
  _prev: MutationState,
  formData: FormData
): Promise<MutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = renameSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ name: parsed.data.name, product_name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("renameCampaign failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/studio/${parsed.data.id}`);
  return { success: true };
}

/**
 * Delete a campaign. The DB cascades `campaign_media` and `campaign_videos`
 * for us, but we also need to scrub the Supabase Storage folder
 * `<user_id>/<campaign_id>/...` so the bytes don't dangle.
 */
export async function deleteCampaign(id: string): Promise<MutationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { error: "Invalid campaign id." };
  }

  // 1. Empty the storage folder first.  RLS limits us to our own files, so
  //    nothing dangerous can happen here even if `id` is wrong.
  try {
    const folder = `${user.id}/${id}`;
    const { data: list } = await supabase.storage.from(BUCKET).list(folder);
    const paths = (list ?? [])
      .filter((entry) => entry.name && !entry.name.startsWith("."))
      .map((entry) => `${folder}/${entry.name}`);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch (e) {
    // Non-fatal: continue with DB delete so the user isn't stuck.
    console.warn("deleteCampaign: storage cleanup partial/failed:", e);
  }

  // 2. Delete the row (cascades to campaign_media + campaign_videos).
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("deleteCampaign failed:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

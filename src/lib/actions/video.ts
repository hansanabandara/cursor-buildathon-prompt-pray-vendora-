"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getFal } from "@/lib/fal/client";
import { composeVideoPrompt } from "@/lib/studio/videoPrompts";
import {
  BACKGROUND_MUSIC_OPTIONS,
  COLOR_PALETTE_OPTIONS,
  PLATFORM_OPTIONS,
  TALKING_STYLE_OPTIONS,
  THEME_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_MODES,
  VIDEO_RESOLUTION_OPTIONS,
  VIDEO_STYLE_OPTIONS,
} from "@/lib/studio/videoTypes";

const BUCKET = "campaign-media";
const SIGNED_URL_TTL = 60 * 60;

export type CampaignVideo = {
  id: string;
  campaign_id: string;
  user_id: string;
  mode: "showcase" | "advertisement";
  platform: string | null;
  duration: string;
  resolution: string;
  aspect_ratio: string;
  generate_audio: boolean;
  video_style: string | null;
  custom_video_style: string | null;
  color_palette: string | null;
  custom_color_palette: string | null;
  theme: string | null;
  custom_theme: string | null;
  background_music: string | null;
  custom_background_music: string | null;
  talking_style: string | null;
  custom_talking_style: string | null;
  custom_brief: string | null;
  prompt: string | null;
  video_url: string | null;
  storage_path: string | null;
  fal_request_id: string | null;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoGenState = {
  error?: string;
  video?: CampaignVideo;
};

// ---- Zod schema (mirrors the form) --------------------------------------

const videoSchema = z.object({
  campaignId: z.string().uuid(),
  mode: z.enum(VIDEO_MODES),
  platform: z.enum(PLATFORM_OPTIONS).optional().nullable(),
  customPlatform: z.string().trim().max(200).optional().nullable(),

  duration: z.enum(VIDEO_DURATION_OPTIONS),
  resolution: z.enum(VIDEO_RESOLUTION_OPTIONS),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIO_OPTIONS),
  generateAudio: z.coerce.boolean(),

  videoStyle: z.enum(VIDEO_STYLE_OPTIONS),
  customVideoStyle: z.string().trim().max(500).optional().nullable(),

  colorPalette: z.enum(COLOR_PALETTE_OPTIONS),
  customColorPalette: z.string().trim().max(500).optional().nullable(),

  theme: z.enum(THEME_OPTIONS),
  customTheme: z.string().trim().max(500).optional().nullable(),

  backgroundMusic: z.enum(BACKGROUND_MUSIC_OPTIONS),
  customBackgroundMusic: z.string().trim().max(500).optional().nullable(),

  talkingStyle: z.enum(TALKING_STYLE_OPTIONS),
  customTalkingStyle: z.string().trim().max(500).optional().nullable(),

  customBrief: z.string().trim().max(2000).optional().nullable(),
});

// ---- Helpers -------------------------------------------------------------

function collectVideoUrls(value: unknown, out: string[] = []): string[] {
  if (!value) return out;
  if (typeof value === "string") {
    if (/^https?:\/\/.*\.(mp4|webm|mov|m4v)(\?|$)/i.test(value)) {
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectVideoUrls(v, out);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["video_url", "url"]) {
      const v = obj[key];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) {
        if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(v)) out.push(v);
      }
    }
    for (const v of Object.values(obj)) collectVideoUrls(v, out);
  }
  return out;
}

async function mirrorVideoToStorage(
  userId: string,
  campaignId: string,
  videoId: string,
  remoteUrl: string
): Promise<{ storagePath: string; signedUrl: string } | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "video/mp4";
    const buffer = new Uint8Array(await res.arrayBuffer());

    const ext = contentType.includes("webm")
      ? "webm"
      : contentType.includes("quicktime")
        ? "mov"
        : "mp4";
    const storagePath = `${userId}/${campaignId}/video-${videoId}.${ext}`;

    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (error) return null;

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);
    return data?.signedUrl
      ? { storagePath, signedUrl: data.signedUrl }
      : null;
  } catch {
    return null;
  }
}

// ---- Main Server Action --------------------------------------------------

export async function generateCampaignVideo(
  _prev: VideoGenState,
  formData: FormData
): Promise<VideoGenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = videoSchema.safeParse({
    campaignId: formData.get("campaignId"),
    mode: formData.get("mode"),
    platform: formData.get("platform") || null,
    customPlatform: formData.get("customPlatform"),
    duration: formData.get("duration") || "auto",
    resolution: formData.get("resolution") || "720p",
    aspectRatio: formData.get("aspectRatio") || "auto",
    generateAudio: formData.get("generateAudio") === "on",
    videoStyle: formData.get("videoStyle"),
    customVideoStyle: formData.get("customVideoStyle"),
    colorPalette: formData.get("colorPalette"),
    customColorPalette: formData.get("customColorPalette"),
    theme: formData.get("theme"),
    customTheme: formData.get("customTheme"),
    backgroundMusic: formData.get("backgroundMusic"),
    customBackgroundMusic: formData.get("customBackgroundMusic"),
    talkingStyle: formData.get("talkingStyle"),
    customTalkingStyle: formData.get("customTalkingStyle"),
    customBrief: formData.get("customBrief"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const input = parsed.data;

  // ---- 1. Load the parent campaign + verify ownership + refined image ----
  const { data: campaignRow, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .eq("user_id", user.id)
    .single();
  if (campaignErr || !campaignRow) {
    return { error: "Campaign not found." };
  }
  if (!campaignRow.result_image_url) {
    return {
      error:
        "Generate a refined image first — the video uses it as the starting frame.",
    };
  }

  // ---- 2. Compose the prompt -------------------------------------------
  const videoPrompt = composeVideoPrompt({
    productName: campaignRow.product_name,
    imagePrompt: campaignRow.prompt,
    mode: input.mode,
    videoStyle: input.videoStyle,
    customVideoStyle: input.customVideoStyle,
    colorPalette: input.colorPalette,
    customColorPalette: input.customColorPalette,
    theme: input.theme,
    customTheme: input.customTheme,
    backgroundMusic: input.backgroundMusic,
    customBackgroundMusic: input.customBackgroundMusic,
    talkingStyle: input.talkingStyle,
    customTalkingStyle: input.customTalkingStyle,
    platform: input.platform ?? null,
    customPlatform: input.customPlatform,
    generateAudio: input.generateAudio,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    customBrief: input.customBrief,
  });

  // ---- 3. Create the video row (processing) ----------------------------
  const { data: videoRow, error: videoInsertErr } = await supabase
    .from("campaign_videos")
    .insert({
      campaign_id: input.campaignId,
      user_id: user.id,
      mode: input.mode,
      platform: input.platform ?? null,
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      generate_audio: input.generateAudio,
      video_style: input.videoStyle,
      custom_video_style: input.customVideoStyle,
      color_palette: input.colorPalette,
      custom_color_palette: input.customColorPalette,
      theme: input.theme,
      custom_theme: input.customTheme,
      background_music: input.backgroundMusic,
      custom_background_music: input.customBackgroundMusic,
      talking_style: input.talkingStyle,
      custom_talking_style: input.customTalkingStyle,
      custom_brief: input.customBrief,
      prompt: videoPrompt,
      status: "processing",
    })
    .select("*")
    .single();
  if (videoInsertErr || !videoRow) {
    console.error("Insert campaign_videos row failed:", videoInsertErr);
    return {
      error: `Could not start video: ${videoInsertErr?.message ?? "unknown"}`,
    };
  }
  const video = videoRow as CampaignVideo;

  // ---- 4. Call fal video-and-text workflow -----------------------------
  const falInput = {
    prompt: videoPrompt,
    image_url: campaignRow.result_image_url,
    resolution: input.resolution,
    duration: input.duration,
    generate_audio: input.generateAudio,
    aspect_ratio: input.aspectRatio,
  };

  console.log(
    "[video] calling fal.stream workflows/udithnethminaedu/video-and-text",
    {
      campaignId: input.campaignId,
      mode: input.mode,
      platform: input.platform,
      resolution: falInput.resolution,
      duration: falInput.duration,
      aspect_ratio: falInput.aspect_ratio,
      generate_audio: falInput.generate_audio,
      promptPreview:
        videoPrompt.slice(0, 160) + (videoPrompt.length > 160 ? "..." : ""),
    }
  );

  let resultUrl: string | null = null;
  let requestId: string | null = null;
  const collected: string[] = [];

  // Track per-node submits so we can fall back to the raw seedance video if the
  // downstream audio merge pipeline fails (e.g. when the workflow's voice-ID
  // extractor LLM goes off-script and feeds garbage into Kokoro TTS, which
  // then rejects with 422 and tanks the entire merge step).
  const nodeSubmits: Record<
    string,
    { app_id: string; request_id: string }
  > = {};
  let workflowError: Error | null = null;

  const fal = getFal();

  try {
    const stream = await fal.stream(
      "workflows/udithnethminaedu/video-and-text",
      { input: falInput }
    );

    for await (const event of stream) {
      console.log("[video] fal event:", JSON.stringify(event).slice(0, 400));
      const ev = event as {
        type?: string;
        node_id?: string;
        app_id?: string;
        request_id?: string;
        requestId?: string;
      };
      requestId = ev.requestId ?? ev.request_id ?? requestId;
      if (
        ev.type === "submit" &&
        ev.node_id &&
        ev.app_id &&
        ev.request_id
      ) {
        nodeSubmits[ev.node_id] = {
          app_id: ev.app_id,
          request_id: ev.request_id,
        };
      }
      collectVideoUrls(event, collected);
    }

    const final = await stream.done();
    console.log(
      "[video] fal stream.done():",
      JSON.stringify(final).slice(0, 600)
    );
    collectVideoUrls(final, collected);

    if (collected.length > 0) {
      resultUrl = collected[collected.length - 1];
    }
    if (!resultUrl) {
      throw new Error(
        "Workflow returned no video URL. Final: " +
          JSON.stringify(final).slice(0, 300)
      );
    }
    console.log("[video] picked result URL:", resultUrl);
  } catch (e) {
    workflowError = e as Error;
    console.warn(
      "[video] workflow failed, attempting seedance-only fallback:",
      (e as Error).message?.slice(0, 200)
    );
  }

  // ----- Fallback: if the merged pipeline failed, fetch the silent video
  //       directly from the seedance image-to-video node by its request_id.
  if (!resultUrl) {
    const seedanceSubmit = Object.values(nodeSubmits).find((s) =>
      s.app_id.includes("seedance")
    );
    if (seedanceSubmit) {
      console.log(
        "[video] fallback: fetching seedance result",
        seedanceSubmit
      );
      try {
        const seedanceResult = (await fal.queue.result(seedanceSubmit.app_id, {
          requestId: seedanceSubmit.request_id,
        })) as { data?: unknown };
        const fallbackUrls: string[] = [];
        collectVideoUrls(seedanceResult.data ?? seedanceResult, fallbackUrls);
        if (fallbackUrls.length > 0) {
          resultUrl = fallbackUrls[fallbackUrls.length - 1];
          requestId = seedanceSubmit.request_id;
          console.log(
            "[video] fallback succeeded — using silent seedance video:",
            resultUrl
          );
        }
      } catch (fallbackErr) {
        console.warn(
          "[video] seedance fallback failed:",
          (fallbackErr as Error).message?.slice(0, 200)
        );
      }
    }
  }

  if (!resultUrl) {
    const err = workflowError ?? new Error("fal.ai video workflow failed.");
    const errBody = (err as Error & { body?: unknown }).body;
    const msg =
      err.message ||
      (typeof errBody === "string" ? errBody : JSON.stringify(errBody)) ||
      "fal.ai video workflow failed.";
    console.error("[video] fal call failed (no fallback):", err);
    await supabase
      .from("campaign_videos")
      .update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        fal_request_id: requestId,
      })
      .eq("id", video.id)
      .eq("user_id", user.id);
    return { error: msg };
  }

  // ---- 5. Mirror to Supabase Storage -----------------------------------
  const mirrored = await mirrorVideoToStorage(
    user.id,
    input.campaignId,
    video.id,
    resultUrl
  );
  const finalUrl = mirrored?.signedUrl ?? resultUrl;

  await supabase.from("campaign_media").insert({
    campaign_id: input.campaignId,
    user_id: user.id,
    kind: "video",
    url: finalUrl,
    storage_path: mirrored?.storagePath ?? null,
    metadata: {
      video_id: video.id,
      fal_request_id: requestId,
      source_url: resultUrl,
      mode: input.mode,
      platform: input.platform,
    },
  });

  const { data: updated } = await supabase
    .from("campaign_videos")
    .update({
      status: "completed",
      video_url: finalUrl,
      storage_path: mirrored?.storagePath ?? null,
      fal_request_id: requestId,
    })
    .eq("id", video.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  revalidatePath(`/studio/${input.campaignId}`);
  revalidatePath("/dashboard");

  return { video: (updated ?? video) as CampaignVideo };
}

/**
 * Fetch all videos for a campaign (most-recent first) and re-sign storage
 * URLs so previews don't 403 after the original TTL.
 */
export async function getCampaignVideos(
  campaignId: string
): Promise<CampaignVideo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("campaign_videos")
    .select("*")
    // Belt-and-suspenders: RLS already filters to auth.uid(), but if the
    // policy is ever loosened or misconfigured, this explicit filter prevents
    // cross-user leakage.
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const rows = data as CampaignVideo[];

  // Re-sign rows that came from our Storage bucket.
  for (const row of rows) {
    if (row.storage_path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL);
      if (signed?.signedUrl) row.video_url = signed.signedUrl;
    }
  }
  return rows;
}

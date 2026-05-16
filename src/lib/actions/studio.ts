"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getFal } from "@/lib/fal/client";
import { composePrompt } from "@/lib/studio/prompts";
import {
  STYLE_OPTIONS,
  BACKGROUND_OPTIONS,
  LIGHTING_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  RESOLUTION_OPTIONS,
  type Background,
  type CameraAngle,
  type Lighting,
  type Style,
  type AspectRatio,
  type Resolution,
} from "@/lib/studio/types";
import type { Campaign } from "@/lib/actions/campaigns";

const BUCKET = "campaign-media";
const SIGNED_URL_TTL = 60 * 60; // 1 hour — enough for fal.ai to fetch

const generateSchema = z.object({
  campaignId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1, "Product name is required."),
  style: z.enum(STYLE_OPTIONS),
  background: z.enum(BACKGROUND_OPTIONS),
  lighting: z.enum(LIGHTING_OPTIONS),
  customStyle: z.string().trim().max(500).optional().nullable(),
  customBackground: z.string().trim().max(500).optional().nullable(),
  customLighting: z.string().trim().max(500).optional().nullable(),
  cameraAngle: z.enum(CAMERA_ANGLE_OPTIONS),
  customCameraAngle: z.string().trim().max(500).optional().nullable(),
  aspectRatio: z.enum(ASPECT_RATIO_OPTIONS),
  resolution: z.enum(RESOLUTION_OPTIONS),
  removeOtherText: z.coerce.boolean(),
});

export type GenerateState = {
  error?: string;
  campaign?: Campaign;
};

function ensureCustom(
  value: string | null | undefined,
  field: string
): string | null {
  if (!value || value.trim().length === 0) {
    throw new Error(`Custom ${field} cannot be empty.`);
  }
  return value.trim();
}

async function uploadSource(
  userId: string,
  campaignId: string,
  file: File
): Promise<{ storagePath: string; signedUrl: string }> {
  const supabase = await createClient();

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const storagePath = `${userId}/${campaignId}/source-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "image/png",
      upsert: true,
    });
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Could not sign source URL: ${signErr?.message ?? ""}`);
  }

  return { storagePath, signedUrl: signed.signedUrl };
}

async function mirrorRefinedToStorage(
  userId: string,
  campaignId: string,
  remoteUrl: string
): Promise<{ storagePath: string; signedUrl: string } | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = new Uint8Array(await res.arrayBuffer());

    const ext = contentType.includes("jpeg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";
    const storagePath = `${userId}/${campaignId}/refined-${Date.now()}.${ext}`;

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

/**
 * Recursively walk a fal response/event and collect any image URLs we find.
 * Workflows produce per-node `completion` events whose `output` may contain
 * `{ images: [{ url }] }`, `{ image: { url } }`, `{ image_url }` or just
 * `{ url }`. We collect them all and let the caller pick the last one (most
 * refined) or the first, as needed.
 */
function collectImageUrls(value: unknown, out: string[] = []): string[] {
  if (!value) return out;
  if (typeof value === "string") {
    if (/^https?:\/\/.*\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)) {
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, out);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Direct image-url keys we trust without regex.
    for (const key of ["image_url", "url"]) {
      const v = obj[key];
      if (typeof v === "string" && v.startsWith("http")) out.push(v);
    }
    for (const v of Object.values(obj)) collectImageUrls(v, out);
  }
  return out;
}

/**
 * Main Server Action: validates the form, uploads the (optional) new source
 * image, calls the fal.ai workflow, mirrors the output back to Supabase
 * Storage, and persists everything in `campaigns` + `campaign_media`.
 */
export async function generateCampaign(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = generateSchema.safeParse({
    campaignId: (formData.get("campaignId") as string) || null,
    productName: formData.get("productName"),
    style: formData.get("style"),
    background: formData.get("background"),
    lighting: formData.get("lighting"),
    customStyle: formData.get("customStyle"),
    customBackground: formData.get("customBackground"),
    customLighting: formData.get("customLighting"),
    cameraAngle: formData.get("cameraAngle"),
    customCameraAngle: formData.get("customCameraAngle"),
    aspectRatio: formData.get("aspectRatio") ?? "",
    resolution: formData.get("resolution") ?? "",
    removeOtherText: formData.get("removeOtherText") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const {
    productName,
    style,
    background,
    lighting,
    cameraAngle,
    aspectRatio,
    resolution,
    removeOtherText,
  } = parsed.data;
  let {
    campaignId,
    customStyle,
    customBackground,
    customLighting,
    customCameraAngle,
  } = parsed.data;

  try {
    if (style === "custom") customStyle = ensureCustom(customStyle, "style");
    if (background === "custom")
      customBackground = ensureCustom(customBackground, "background");
    if (lighting === "custom")
      customLighting = ensureCustom(customLighting, "lighting");
    if (cameraAngle === "custom")
      customCameraAngle = ensureCustom(customCameraAngle, "camera angle");
  } catch (e) {
    return { error: (e as Error).message };
  }

  // ---- 1. Load or create campaign row ----------------------------------
  let campaign: Campaign | null = null;

  if (campaignId) {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();
    if (error || !data) return { error: "Campaign not found." };
    campaign = data as Campaign;
  } else {
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        name: productName,
        product_name: productName,
        status: "processing",
        style: style as Style,
        background: background as Background,
        lighting: lighting as Lighting,
        custom_style: customStyle,
        custom_background: customBackground,
        custom_lighting: customLighting,
        camera_angle: cameraAngle as CameraAngle,
        custom_camera_angle: customCameraAngle,
        aspect_ratio: (aspectRatio as AspectRatio) || null,
        resolution: (resolution as Resolution) || null,
        remove_other_text: removeOtherText,
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error("Insert campaigns row failed:", error);
      return {
        error:
          `Could not create campaign: ${error?.message ?? "unknown error"}. ` +
          (error?.code === "42501"
            ? "Postgres rejected the INSERT for grants/RLS reasons. " +
              "Re-check that both SQL migrations were applied and that you are " +
              "using a current Supabase publishable / anon key."
            : ""),
      };
    }
    campaign = data as Campaign;
    campaignId = campaign.id;
  }

  if (!campaign || !campaignId) {
    return { error: "Campaign initialisation failed." };
  }

  // ---- 2. Upload the source image (if a new one was provided) ---------
  const file = formData.get("sourceImage") as File | null;
  let sourceUrl = campaign.source_image_url ?? null;

  if (file && file.size > 0) {
    console.log("[studio] uploading new source image", {
      name: file.name,
      sizeKB: Math.round(file.size / 1024),
      type: file.type,
    });
    try {
      const uploaded = await uploadSource(user.id, campaignId, file);
      sourceUrl = uploaded.signedUrl;

      await supabase.from("campaign_media").insert({
        campaign_id: campaignId,
        user_id: user.id,
        kind: "source",
        url: uploaded.signedUrl,
        storage_path: uploaded.storagePath,
      });
    } catch (e) {
      console.error("[studio] source upload failed:", e);
      return { error: (e as Error).message };
    }
  }

  if (!sourceUrl) {
    return { error: "Please upload a product image." };
  }

  // ---- 3. Compose prompt + mark processing -----------------------------
  const prompt = composePrompt({
    productName,
    style,
    background,
    lighting,
    cameraAngle,
    customStyle,
    customBackground,
    customLighting,
    customCameraAngle,
    removeOtherText,
    aspectRatio,
    resolution,
  });

  await supabase
    .from("campaigns")
    .update({
      name: productName,
      product_name: productName,
      status: "processing",
      style,
      background,
      lighting,
      custom_style: customStyle,
      custom_background: customBackground,
      custom_lighting: customLighting,
      camera_angle: cameraAngle,
      custom_camera_angle: customCameraAngle,
      aspect_ratio: aspectRatio || null,
      resolution: resolution || null,
      remove_other_text: removeOtherText,
      prompt,
      source_image_url: sourceUrl,
      error_message: null,
    })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  // ---- 4. Call the fal.ai workflow -------------------------------------
  let resultUrl: string | null = null;
  let requestId: string | null = null;
  const collectedImages: string[] = [];

  const falInput = {
    prompt,
    image_url_field: sourceUrl,
    aspect_ratio: aspectRatio || "",
    resolution: resolution || "",
  };

  console.log(
    "[studio] calling fal.stream workflows/udithnethminaedu/image-refine",
    {
      promptPreview:
        prompt.slice(0, 120) + (prompt.length > 120 ? "..." : ""),
      sourceUrl: sourceUrl.slice(0, 80) + "...",
      aspect_ratio: falInput.aspect_ratio,
      resolution: falInput.resolution,
    }
  );

  try {
    const fal = getFal();
    const stream = await fal.stream(
      "workflows/udithnethminaedu/image-refine",
      { input: falInput }
    );

    for await (const event of stream) {
      console.log("[studio] fal event:", JSON.stringify(event).slice(0, 400));

      // Workflows emit one `completion` event per node. The image-producing
      // node (e.g. nano-banana-2) carries the URL we want; later nodes
      // (llava-next description) don't, so we have to collect across events.
      const evObj = event as {
        request_id?: string;
        requestId?: string;
      };
      requestId = evObj.requestId ?? evObj.request_id ?? requestId;

      collectImageUrls(event, collectedImages);
    }

    const final = await stream.done();
    console.log(
      "[studio] fal stream.done():",
      JSON.stringify(final).slice(0, 600)
    );
    collectImageUrls(final, collectedImages);

    // Prefer the LAST image URL we saw (most refined node output), but fall
    // back to the first if there's only one.
    if (collectedImages.length > 0) {
      resultUrl = collectedImages[collectedImages.length - 1];
    }

    if (!resultUrl) {
      throw new Error(
        "Workflow returned no image URL. Final response: " +
          JSON.stringify(final).slice(0, 300)
      );
    }

    console.log("[studio] picked result URL:", resultUrl);
  } catch (e) {
    const err = e as Error & { body?: unknown; status?: number };
    const msg =
      err.message ||
      (typeof err.body === "string" ? err.body : JSON.stringify(err.body)) ||
      "fal.ai workflow failed.";
    console.error("[studio] fal call failed:", err);
    await supabase
      .from("campaigns")
      .update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        fal_request_id: requestId,
      })
      .eq("id", campaignId)
      .eq("user_id", user.id);
    return { error: msg };
  }

  // ---- 5. Mirror refined output into Supabase Storage ------------------
  const mirrored = await mirrorRefinedToStorage(
    user.id,
    campaignId,
    resultUrl
  );
  const finalUrl = mirrored?.signedUrl ?? resultUrl;

  await supabase.from("campaign_media").insert({
    campaign_id: campaignId,
    user_id: user.id,
    kind: "refined",
    url: finalUrl,
    storage_path: mirrored?.storagePath ?? null,
    metadata: { fal_request_id: requestId, source_url: resultUrl },
  });

  // ---- 6. Finalise campaign --------------------------------------------
  const { data: updated } = await supabase
    .from("campaigns")
    .update({
      status: "completed",
      result_image_url: finalUrl,
      thumbnail_url: finalUrl,
      fal_request_id: requestId,
    })
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  revalidatePath("/dashboard");
  revalidatePath(`/studio/${campaignId}`);

  return { campaign: (updated ?? campaign) as Campaign };
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return (data as Campaign | null) ?? null;
}

/**
 * Re-sign the source/result image URLs in case the originals have expired.
 * Best-effort: returns the input campaign unchanged on failure.
 */
export async function refreshCampaignUrls(campaign: Campaign): Promise<Campaign> {
  const supabase = await createClient();

  const next = { ...campaign };

  // Look up the latest media rows and re-sign their storage paths.
  const { data: mediaRows } = await supabase
    .from("campaign_media")
    .select("kind, storage_path")
    .eq("campaign_id", campaign.id)
    .not("storage_path", "is", null)
    .order("created_at", { ascending: false });

  if (!mediaRows) return next;

  for (const kind of ["source", "refined"] as const) {
    const row = mediaRows.find((m) => m.kind === kind);
    if (!row?.storage_path) continue;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL);
    if (!data?.signedUrl) continue;
    if (kind === "source") next.source_image_url = data.signedUrl;
    if (kind === "refined") {
      next.result_image_url = data.signedUrl;
      next.thumbnail_url = data.signedUrl;
    }
  }

  return next;
}

/**
 * Skip image enhancement entirely. Uploads the raw image directly, creates a
 * campaign row with status='completed' and result_image_url = source_image_url
 * so the user can proceed straight to video/poster/3D creation without
 * waiting for the fal.ai refine workflow.
 */
export async function skipEnhancement(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const productName = (formData.get("productName") as string)?.trim();
  if (!productName) return { error: "Product name is required." };

  const file = formData.get("sourceImage") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please upload a product image first." };
  }

  // Create a campaign row so we have an id for the storage path.
  const { data: campaignRow, error: insertErr } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: productName,
      product_name: productName,
      status: "draft", // temporary — updated to completed below
    })
    .select("*")
    .single();

  if (insertErr || !campaignRow) {
    console.error("skipEnhancement: insert failed:", insertErr);
    return { error: `Could not create campaign: ${insertErr?.message ?? "unknown"}` };
  }

  const campaignId = campaignRow.id as string;

  // Upload the raw image.
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const storagePath = `${user.id}/${campaignId}/source-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "image/png", upsert: true });

  if (uploadErr) {
    // Clean up the orphaned campaign row.
    await supabase.from("campaigns").delete().eq("id", campaignId).eq("user_id", user.id);
    return { error: `Image upload failed: ${uploadErr.message}` };
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  const imageUrl = signed?.signedUrl ?? null;
  if (!imageUrl) {
    return { error: "Could not generate a signed URL for the uploaded image." };
  }

  // Record the media entry.
  await supabase.from("campaign_media").insert({
    campaign_id: campaignId,
    user_id: user.id,
    kind: "source",
    url: imageUrl,
    storage_path: storagePath,
  });

  // Mark the campaign as completed — the raw image IS the result.
  const { data: updated } = await supabase
    .from("campaigns")
    .update({
      status: "completed",
      source_image_url: imageUrl,
      result_image_url: imageUrl,
      thumbnail_url: imageUrl,
    })
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  revalidatePath("/dashboard");
  revalidatePath(`/studio/${campaignId}`);

  return { campaign: (updated ?? campaignRow) as Campaign };
}

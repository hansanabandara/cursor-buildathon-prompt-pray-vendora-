"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getFal } from "@/lib/fal/client";
import { collectImageUrls } from "@/lib/fal/collectOutputs";
import { composePosterBrief, type PosterBriefInput } from "@/lib/studio/posterBrief";
import {
  POSTER_ASPECT_RATIO_OPTIONS,
  POSTER_LAYOUT_PRESETS,
  POSTER_RESOLUTION_OPTIONS,
} from "@/lib/studio/posterTypes";
import type { CampaignArtifactRow } from "@/lib/actions/campaignArtifacts";

const BUCKET = "campaign-media";
const SIGNED_URL_TTL_FOR_FAL = 60 * 60;
const WORKFLOW_POSTER = "workflows/hansanabadara/poster-api";

export type PosterGenState = {
  error?: string;
  artifact?: CampaignArtifactRow;
};

const posterSchemaBase = z.object({
  campaignId: z.string().uuid(),
  aspectRatio: z.enum(POSTER_ASPECT_RATIO_OPTIONS),
  resolution: z.enum(POSTER_RESOLUTION_OPTIONS),
  layoutPreset: z.enum(POSTER_LAYOUT_PRESETS),

  headline: z.string().trim().max(200).optional().nullable(),
  subheadline: z.string().trim().max(300).optional().nullable(),
  price: z.string().trim().max(50).optional().nullable(),
  compareAtPrice: z.string().trim().max(50).optional().nullable(),
  currency: z.string().trim().max(10).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  whatsapp: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().max(250).optional().nullable(),
  promoCode: z.string().trim().max(80).optional().nullable(),
  validUntil: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  ctaText: z.string().trim().max(120).optional().nullable(),
  extraNotes: z.string().trim().max(2500).optional().nullable(),
});

const posterSchema = posterSchemaBase.refine(
  (d) =>
    d.layoutPreset !== "custom" ||
    (d.extraNotes && d.extraNotes.trim().length >= 10),
  { message: "Custom layout requires at least ~10 chars of layout notes.", path: ["extraNotes"] }
);

async function uploadSidecarImage(
  userId: string,
  campaignId: string,
  file: File,
  role: string
): Promise<{ storagePath: string; signedUrl: string }> {
  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `${userId}/${campaignId}/${role}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (uploadErr) throw new Error(uploadErr.message);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_FOR_FAL);
  if (error || !signed?.signedUrl) throw new Error("Could not sign image URL.");
  return { storagePath, signedUrl: signed.signedUrl };
}

async function mirrorPosterToStorage(
  userId: string,
  campaignId: string,
  remoteUrl: string,
  slug: string
): Promise<{ storagePath: string; signedUrl: string } | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
    const buf = new Uint8Array(await res.arrayBuffer());
    let ext = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg"))
      ext = "jpg";
    else if (contentType.includes("webp")) ext = "webp";

    const storagePath = `${userId}/${campaignId}/poster-${slug}.${ext}`;
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType, upsert: true });
    if (error) return null;

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_FOR_FAL);
    return data?.signedUrl ? { storagePath, signedUrl: data.signedUrl } : null;
  } catch {
    return null;
  }
}

export async function generateCampaignPoster(
  _prev: PosterGenState,
  formData: FormData
): Promise<PosterGenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = posterSchema.safeParse({
    campaignId: formData.get("campaignId"),
    aspectRatio: formData.get("aspectRatio") || "auto",
    resolution: formData.get("resolution") || "2K",
    layoutPreset: formData.get("layoutPreset"),

    headline: formData.get("headline"),
    subheadline: formData.get("subheadline"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    currency: formData.get("currency"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    website: formData.get("website"),
    promoCode: formData.get("promoCode"),
    validUntil: formData.get("validUntil"),
    address: formData.get("address"),
    ctaText: formData.get("ctaText"),
    extraNotes: formData.get("extraNotes"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors.extraNotes?.[0] ??
        parsed.error.issues[0]?.message ??
        "Invalid poster form.",
    };
  }
  const input = parsed.data;

  const { data: campaignRow, error: ce } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .eq("user_id", user.id)
    .single();

  if (ce || !campaignRow?.result_image_url) {
    return { error: "Campaign not found or no refined hero image yet." };
  }

  const image_urls: string[] = [campaignRow.result_image_url as string];

  const sidecarFile = formData.get("posterSidecarImage") as File | null;
  if (sidecarFile && sidecarFile.size > 0) {
    try {
      const { signedUrl } = await uploadSidecarImage(
        user.id,
        input.campaignId,
        sidecarFile,
        "poster-sidecar"
      );
      image_urls.push(signedUrl);
    } catch (e) {
      return { error: (e as Error).message.slice(0, 500) };
    }
  }

  const briefRest: PosterBriefInput = {
    layoutPreset: input.layoutPreset,
    headline: input.headline,
    subheadline: input.subheadline,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    currency: input.currency,
    phone: input.phone,
    whatsapp: input.whatsapp,
    email: input.email,
    website: input.website,
    promoCode: input.promoCode,
    validUntil: input.validUntil,
    address: input.address,
    ctaText: input.ctaText,
    extraNotes: input.extraNotes,
  };
  const composedPrompt = composePosterBrief(briefRest);

  const falInput = {
    image_urls,
    prompt: composedPrompt,
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
  };

  console.log("[poster] fal.stream poster-api", {
    campaignId: input.campaignId,
    urls: image_urls.length,
    aspect_ratio: falInput.aspect_ratio,
    resolution: falInput.resolution,
  });

  let resultUrl: string | null = null;
  const collected: string[] = [];
  let requestId: string | null = null;

  try {
    const fal = getFal();
    const stream = await fal.stream(WORKFLOW_POSTER, { input: falInput });

    for await (const event of stream) {
      const ev = event as { request_id?: string; requestId?: string };
      requestId = ev.requestId ?? ev.request_id ?? requestId;
      collectImageUrls(event, collected);
    }
    const final = await stream.done();
    collectImageUrls(final, collected);
    if (collected.length > 0) resultUrl = collected[collected.length - 1];

    if (!resultUrl) {
      throw new Error(
        `Poster workflow returned no image URL. Snippet: ${JSON.stringify(final).slice(0, 280)}`
      );
    }
  } catch (e) {
    const msg = (e as Error).message.slice(0, 1000);
    console.error("[poster] failed:", msg);
    return { error: msg };
  }

  const slug = randomUUID().slice(0, 8);
  const mirrored = await mirrorPosterToStorage(
    user.id,
    input.campaignId,
    resultUrl,
    slug
  );
  const finalUrl = mirrored?.signedUrl ?? resultUrl;

  const { data: row, error: insErr } = await supabase
    .from("campaign_media")
    .insert({
      campaign_id: input.campaignId,
      user_id: user.id,
      kind: "poster",
      url: finalUrl,
      storage_path: mirrored?.storagePath ?? null,
      metadata: {
        workflow: WORKFLOW_POSTER,
        fal_request_id: requestId,
        fal_source_url: resultUrl,
        aspect_ratio: input.aspectRatio,
        resolution: input.resolution,
        layout_preset: input.layoutPreset,
        prompt_preview: composedPrompt.slice(0, 400),
      },
    })
    .select("*")
    .single();

  if (insErr || !row) {
    return { error: insErr?.message ?? "Could not save poster artifact." };
  }

  revalidatePath(`/studio/${input.campaignId}`);
  revalidatePath("/dashboard");

  return { artifact: row as CampaignArtifactRow };
}

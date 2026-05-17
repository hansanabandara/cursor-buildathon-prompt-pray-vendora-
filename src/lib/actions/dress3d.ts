"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getFal } from "@/lib/fal/client";
import { collectGlbUrls } from "@/lib/fal/collectOutputs";
import type { CampaignArtifactRow } from "@/lib/actions/campaignArtifacts";

const BUCKET = "campaign-media";
const SIGNED_URL_TTL_FOR_FAL = 60 * 60;

const WORKFLOW_DRESS_3D = "workflows/hansanabadara/dress-3d";

export type Dress3dGenState = {
  error?: string;
  artifact?: CampaignArtifactRow;
};

const dressSchema = z.object({
  campaignId: z.string().uuid(),
});

async function uploadDressSidecarImage(
  userId: string,
  campaignId: string,
  file: File,
  slot: number
): Promise<{ signedUrl: string }> {
  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `${userId}/${campaignId}/dress-slot${slot}-${Date.now()}.${ext}`;
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
  return { signedUrl: signed.signedUrl };
}

async function mirrorGlbToStorage(
  userId: string,
  campaignId: string,
  remoteUrl: string,
  slug: string
): Promise<{ storagePath: string; signedUrl: string } | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());

    const storagePath = `${userId}/${campaignId}/model-${slug}.glb`;
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, {
        contentType: "model/gltf-binary",
        upsert: true,
      });
    if (error) return null;

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_FOR_FAL);

    return data?.signedUrl ? { storagePath, signedUrl: data.signedUrl } : null;
  } catch {
    return null;
  }
}

/**
 * Turns an uploaded garment / product snapshot into an interactive Dress-3D GLB mesh.
 *
 * Starts from the refined campaign image (`result_image_url`) and optionally merges
 * a second reference snapshot from the user's machine.
 */
export async function generateDress3DModel(
  _prev: Dress3dGenState,
  formData: FormData
): Promise<Dress3dGenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = dressSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { campaignId } = parsed.data;

  const { data: campaignRow, error: ce } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (ce || !campaignRow?.result_image_url) {
    return {
      error: "Campaign not found or no refined hero image yet — refine first.",
    };
  }

  const image_urls: string[] = [campaignRow.result_image_url as string];

  const aux = formData.get("dress3dSecondaryImage") as File | null;
  if (aux && aux.size > 0) {
    try {
      const { signedUrl } = await uploadDressSidecarImage(
        user.id,
        campaignId,
        aux,
        2
      );
      image_urls.push(signedUrl);
    } catch (e) {
      return { error: (e as Error).message.slice(0, 500) };
    }
  }

  const falInput = { image_urls };

  console.log("[dress3d] fal.stream dress-3d", {
    campaignId,
    imageCount: image_urls.length,
  });

  let glbUrl: string | null = null;
  const collected: string[] = [];
  let requestId: string | null = null;

  try {
    const fal = getFal();
    const stream = await fal.stream(WORKFLOW_DRESS_3D, { input: falInput });

    for await (const event of stream) {
      const ev = event as { request_id?: string; requestId?: string };
      requestId = ev.requestId ?? ev.request_id ?? requestId;
      collectGlbUrls(event, collected);
    }
    const final = await stream.done();
    collectGlbUrls(final, collected);
    if (collected.length > 0) glbUrl = collected[collected.length - 1];

    if (!glbUrl) {
      throw new Error(
        `Dress-3D workflow returned no .glb URL. Snippet: ${JSON.stringify(final).slice(0, 280)}`
      );
    }
  } catch (e) {
    const msg = (e as Error).message.slice(0, 1000);
    console.error("[dress3d] failed:", msg);
    return { error: msg };
  }

  const slug = randomUUID().slice(0, 8);
  const mirrored = await mirrorGlbToStorage(
    user.id,
    campaignId,
    glbUrl,
    slug
  );
  const finalUrl = mirrored?.signedUrl ?? glbUrl;

  const { data: row, error: insErr } = await supabase
    .from("campaign_media")
    .insert({
      campaign_id: campaignId,
      user_id: user.id,
      kind: "model_3d",
      url: finalUrl,
      storage_path: mirrored?.storagePath ?? null,
      metadata: {
        workflow: WORKFLOW_DRESS_3D,
        fal_request_id: requestId,
        fal_source_url: glbUrl,
        input_image_count: image_urls.length,
      },
    })
    .select("*")
    .single();

  if (insErr || !row)
    return { error: insErr?.message ?? "Could not persist 3D model row." };

  revalidatePath(`/studio/${campaignId}`);
  revalidatePath("/dashboard");

  return { artifact: row as CampaignArtifactRow };
}

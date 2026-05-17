"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, ImagePlus, Loader2, Sparkles } from "lucide-react";

import {
  generateCampaignPoster,
  type PosterGenState,
} from "@/lib/actions/poster";
import type { CampaignArtifactRow } from "@/lib/actions/campaignArtifacts";
import {
  POSTER_ASPECT_RATIO_OPTIONS,
  POSTER_ASPECT_LABELS,
  POSTER_LAYOUT_LABELS,
  POSTER_LAYOUT_PRESETS,
  POSTER_RESOLUTION_LABELS,
  POSTER_RESOLUTION_OPTIONS,
  type PosterLayoutPreset,
} from "@/lib/studio/posterTypes";

const initialState: PosterGenState = {};

const selectClass =
  "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
const inputClass =
  "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
const textareaClass =
  "flex min-h-[88px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg btn-glow transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Designing poster…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate poster
        </>
      )}
    </button>
  );
}

type Props = {
  campaignId: string;
  latestPoster: CampaignArtifactRow | null;
  onArtifactsUpdated?: () => void | Promise<void>;
};

export function PosterForm({
  campaignId,
  latestPoster,
  onArtifactsUpdated,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    generateCampaignPoster,
    initialState
  );

  const resultUrl = state.artifact?.url ?? latestPoster?.url ?? null;

  const lastDone = useRef<string | null>(null);
  useEffect(() => {
    if (
      state.artifact?.id &&
      state.artifact.id !== lastDone.current
    ) {
      lastDone.current = state.artifact.id;
      void onArtifactsUpdated?.();
      router.refresh();
    }
  }, [state.artifact?.id, router, onArtifactsUpdated]);

  const [layoutPreset, setLayoutPreset] =
    useState<PosterLayoutPreset>("brand_hero");
  const [sidecarBlob, setSidecarBlob] = useState<string | null>(null);
  const sidecarRef = useRef<HTMLInputElement>(null);

  function onSidecarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (sidecarBlob) URL.revokeObjectURL(sidecarBlob);
    setSidecarBlob(file ? URL.createObjectURL(file) : null);
  }

  useEffect(() => {
    return () => {
      if (sidecarBlob) URL.revokeObjectURL(sidecarBlob);
    };
  }, [sidecarBlob]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground/90">
            Layout presets
          </h3>
          <p className="text-xs text-muted-foreground">
            Choose an overall design direction — then fill any price/contact
            fields you want on the flyer. These are stitched into one prompt for
            the poster workflow.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Preset</label>
          <select
            name="layoutPreset"
            className={selectClass}
            value={layoutPreset}
            onChange={(e) =>
              setLayoutPreset(e.target.value as PosterLayoutPreset)
            }
          >
            {POSTER_LAYOUT_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {layoutPreset !== "custom"
              ? POSTER_LAYOUT_LABELS[layoutPreset].slice(0, 280) +
                  (POSTER_LAYOUT_LABELS[layoutPreset].length > 280 ? "…" : "")
              : 'Describe layout / typography / colours freely in “Layout notes”.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Aspect ratio</label>
            <select name="aspectRatio" className={selectClass}>
              {POSTER_ASPECT_RATIO_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {POSTER_ASPECT_LABELS[o]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Resolution</label>
            <select name="resolution" className={selectClass}>
              {POSTER_RESOLUTION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {POSTER_RESOLUTION_LABELS[o]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Headline</label>
            <input
              name="headline"
              className={inputClass}
              placeholder="Flash sale tonight"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subheadline</label>
            <input
              name="subheadline"
              className={inputClass}
              placeholder="Free delivery on bundles"
              maxLength={300}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Currency</label>
            <input
              name="currency"
              className={inputClass}
              placeholder="$ / Rs / ₹"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <input
              name="price"
              className={inputClass}
              placeholder="19.99"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Compare-at (was)
            </label>
            <input
              name="compareAtPrice"
              className={inputClass}
              placeholder="29.99"
              maxLength={50}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <input
              name="phone"
              className={inputClass}
              placeholder="+94 71 555 6677"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp</label>
            <input
              name="whatsapp"
              className={inputClass}
              placeholder="Same digit or WhatsApp deeplink hint"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              className={inputClass}
              placeholder="sales@brand.com"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <input
              name="website"
              className={inputClass}
              placeholder="brand.com/order"
              maxLength={250}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Promo code</label>
            <input
              name="promoCode"
              className={inputClass}
              placeholder="VENDORA20"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valid until</label>
            <input
              name="validUntil"
              className={inputClass}
              placeholder="31 May • while stocks last"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CTA badge</label>
            <input
              name="ctaText"
              className={inputClass}
              placeholder="Shop now"
              maxLength={120}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Store address / footer line</label>
          <textarea
            name="address"
            className={textareaClass}
            rows={2}
            placeholder="No.08, Colombo 03"
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Layout notes {layoutPreset === "custom" ? "(required)" : "(optional)"}
          </label>
          <textarea
            name="extraNotes"
            className={textareaClass}
            required={layoutPreset === "custom"}
            minLength={layoutPreset === "custom" ? 10 : undefined}
            rows={4}
            placeholder="Typography mood, forbidden colours, must-show badges, bilingual copy…"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Second reference photo (optional)</label>
          <p className="text-xs text-muted-foreground">
            Add a mood board, storefront photo or alternate angle —
            forwarded as a second workflow image URL beside your refined hero.
          </p>
          <input
            ref={sidecarRef}
            type="file"
            name="posterSidecarImage"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onSidecarChange}
          />
          {sidecarBlob ? (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/3 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sidecarBlob}
                alt="Sidecar"
                className="h-16 w-28 rounded-md object-cover"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sidecarRef.current?.click()}
                  className="text-xs font-medium text-violet-300 underline-offset-2 hover:underline"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sidecarRef.current!.value = "";
                    if (sidecarBlob) URL.revokeObjectURL(sidecarBlob);
                    setSidecarBlob(null);
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sidecarRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-8 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground/80"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-sm">Add supplementary image</span>
            </button>
          )}
        </div>

        {state.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <GenerateButton />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground/80">
            Poster preview
          </h3>
          {resultUrl ? (
            <a
              href={resultUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : null}
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/8 bg-black/40">
          {resultUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultUrl}
              alt="Poster"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 text-violet-400/60" />
              <p className="text-sm">
                Poster artwork appears here after generation.
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

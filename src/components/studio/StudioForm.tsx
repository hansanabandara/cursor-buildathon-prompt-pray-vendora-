"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import {
  Download,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  generateCampaign,
  skipEnhancement,
  type GenerateState,
} from "@/lib/actions/studio";
import type { Campaign } from "@/lib/actions/campaigns";
import {
  ASPECT_RATIO_LABELS,
  ASPECT_RATIO_OPTIONS,
  BACKGROUND_LABELS,
  BACKGROUND_OPTIONS,
  CAMERA_ANGLE_LABELS,
  CAMERA_ANGLE_OPTIONS,
  LIGHTING_LABELS,
  LIGHTING_OPTIONS,
  RESOLUTION_LABELS,
  RESOLUTION_OPTIONS,
  STYLE_LABELS,
  STYLE_OPTIONS,
  type AspectRatio,
  type Background,
  type CameraAngle,
  type Lighting,
  type Resolution,
  type Style,
} from "@/lib/studio/types";

const initialState: GenerateState = {};

const selectClass =
  "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground ring-offset-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 transition-colors hover:bg-white/8";
const inputClass =
  "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground ring-offset-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 transition-colors";
const textareaClass =
  "flex min-h-[72px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground ring-offset-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 resize-none transition-colors";

function SubmitButton({ hasResult }: { hasResult: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg btn-glow transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:transform-none"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generating…
        </>
      ) : hasResult ? (
        <>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Retry Enhancement
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Enhance with AI
        </>
      )}
    </button>
  );
}

type Props = {
  campaign: Campaign | null;
  onGenerated?: (campaign: Campaign) => void;
};

export function StudioForm({ campaign, onGenerated }: Props) {
  const [state, formAction] = useActionState(generateCampaign, initialState);
  const [skipPending, startSkip] = useTransition();
  const [skipError, setSkipError] = useState<string | null>(null);

  // Pre-fill from existing campaign (edit mode)
  const [productName, setProductName] = useState(campaign?.product_name ?? "");
  const [style, setStyle] = useState<Style>(campaign?.style ?? "realistic");
  const [background, setBackground] = useState<Background>(
    campaign?.background ?? "studio"
  );
  const [lighting, setLighting] = useState<Lighting>(
    campaign?.lighting ?? "cinematic"
  );
  const [customStyle, setCustomStyle] = useState(campaign?.custom_style ?? "");
  const [customBackground, setCustomBackground] = useState(
    campaign?.custom_background ?? ""
  );
  const [customLighting, setCustomLighting] = useState(
    campaign?.custom_lighting ?? ""
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    campaign?.aspect_ratio ?? ""
  );
  const [resolution, setResolution] = useState<Resolution>(
    campaign?.resolution ?? ""
  );
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(
    campaign?.camera_angle ?? "three_quarter"
  );
  const [customCameraAngle, setCustomCameraAngle] = useState(
    campaign?.custom_camera_angle ?? ""
  );
  const [removeOtherText, setRemoveOtherText] = useState<boolean>(
    campaign?.remove_other_text ?? false
  );

  const [filePreview, setFilePreview] = useState<string | null>(
    campaign?.source_image_url ?? null
  );
  const [hasNewFile, setHasNewFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resultUrl =
    state.campaign?.result_image_url ?? campaign?.result_image_url ?? null;

  const currentCampaignId = state.campaign?.id ?? campaign?.id ?? null;

  // Fire onGenerated whenever a fresh result is available.
  useEffect(() => {
    if (state.campaign?.result_image_url && onGenerated) {
      onGenerated(state.campaign);
    }
  }, [state.campaign, onGenerated]);

  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(URL.createObjectURL(f));
    setHasNewFile(true);
  }

  function clearFile() {
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    setHasNewFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSkip() {
    const fileInput = fileInputRef.current;
    const file = fileInput?.files?.[0];
    if (!file) return;
    if (!productName.trim()) {
      setSkipError("Product name is required before skipping.");
      return;
    }
    setSkipError(null);

    const fd = new FormData();
    fd.set("productName", productName.trim());
    fd.set("sourceImage", file);

    startSkip(async () => {
      const result = await skipEnhancement({} as GenerateState, fd);
      if (result.error) {
        setSkipError(result.error);
      } else if (result.campaign && onGenerated) {
        onGenerated(result.campaign);
      }
    });
  }

  const hasImageLoaded = Boolean(filePreview);
  const canSkip = hasImageLoaded && !resultUrl && !skipPending;

  return (
    <motion.form
      action={formAction}
      className="grid gap-8 lg:grid-cols-[1fr,1.1fr]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Hidden campaign id (for edits / retries) */}
      <input type="hidden" name="campaignId" value={currentCampaignId ?? ""} />

      {/* -------------------- LEFT: controls -------------------- */}
      <div className="space-y-5">
        {/* Product name */}
        <div className="space-y-2">
          <label htmlFor="productName" className="block text-sm font-medium text-foreground/90">
            Product name
          </label>
          <input
            id="productName"
            name="productName"
            type="text"
            required
            placeholder="e.g. Aurora Wireless Headphones"
            className={inputClass}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />

          <label
            htmlFor="removeOtherText"
            className="flex cursor-pointer items-start gap-2 pt-1"
          >
            <input
              id="removeOtherText"
              name="removeOtherText"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
              checked={removeOtherText}
              onChange={(e) => setRemoveOtherText(e.target.checked)}
            />
            <span className="text-xs text-muted-foreground">
              Keep only the product name — remove other text, watermarks, price tags.
            </span>
          </label>
        </div>

        {/* Image upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground/90">Product image</label>
          <div className="overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/3 transition-colors hover:border-white/20">
            {filePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filePreview}
                  alt="Source preview"
                  className="aspect-video w-full object-contain"
                />
                <div className="flex items-center justify-between gap-2 border-t border-white/8 bg-white/5 px-3 py-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {hasNewFile ? "New upload (unsaved)" : "Current source image"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-foreground/80 underline-offset-2 hover:underline"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:bg-white/5"
              >
                <div className="rounded-full border border-white/10 bg-white/5 p-3">
                  <ImagePlus className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/70">
                    Click to upload product image
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10 MB</p>
                </div>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            id="sourceImage"
            name="sourceImage"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Skip to media button — only visible when image is loaded but no result yet */}
          <AnimatePresence>
            {canSkip ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={skipPending}
                  className="mt-1 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 text-xs font-medium text-sky-300 transition-all hover:bg-sky-500/20 hover:border-sky-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {skipPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  {skipPending ? "Preparing…" : "Use image directly — skip enhancement"}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {skipError ? (
            <p className="text-xs text-destructive">{skipError}</p>
          ) : null}
        </div>

        {/* Style */}
        <div className="space-y-2">
          <label htmlFor="style" className="block text-sm font-medium text-foreground/90">
            Style
          </label>
          <select
            id="style"
            name="style"
            className={selectClass}
            value={style}
            onChange={(e) => setStyle(e.target.value as Style)}
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {STYLE_LABELS[opt]}
              </option>
            ))}
          </select>
          {style === "custom" ? (
            <textarea
              name="customStyle"
              required
              placeholder="Describe the exact style you want…"
              className={textareaClass}
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customStyle" value="" />
          )}
        </div>

        {/* Background */}
        <div className="space-y-2">
          <label htmlFor="background" className="block text-sm font-medium text-foreground/90">
            Background
          </label>
          <select
            id="background"
            name="background"
            className={selectClass}
            value={background}
            onChange={(e) => setBackground(e.target.value as Background)}
          >
            {BACKGROUND_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {BACKGROUND_LABELS[opt]}
              </option>
            ))}
          </select>
          {background === "custom" ? (
            <textarea
              name="customBackground"
              required
              placeholder="Describe the background…"
              className={textareaClass}
              value={customBackground}
              onChange={(e) => setCustomBackground(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customBackground" value="" />
          )}
        </div>

        {/* Lighting */}
        <div className="space-y-2">
          <label htmlFor="lighting" className="block text-sm font-medium text-foreground/90">
            Lighting
          </label>
          <select
            id="lighting"
            name="lighting"
            className={selectClass}
            value={lighting}
            onChange={(e) => setLighting(e.target.value as Lighting)}
          >
            {LIGHTING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {LIGHTING_LABELS[opt]}
              </option>
            ))}
          </select>
          {lighting === "custom" ? (
            <textarea
              name="customLighting"
              required
              placeholder="Describe the lighting…"
              className={textareaClass}
              value={customLighting}
              onChange={(e) => setCustomLighting(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customLighting" value="" />
          )}
        </div>

        {/* Camera angle */}
        <div className="space-y-2">
          <label htmlFor="cameraAngle" className="block text-sm font-medium text-foreground/90">
            Camera angle
          </label>
          <select
            id="cameraAngle"
            name="cameraAngle"
            className={selectClass}
            value={cameraAngle}
            onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
          >
            {CAMERA_ANGLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {CAMERA_ANGLE_LABELS[opt]}
              </option>
            ))}
          </select>
          {cameraAngle === "custom" ? (
            <textarea
              name="customCameraAngle"
              required
              placeholder="Describe the camera angle…"
              className={textareaClass}
              value={customCameraAngle}
              onChange={(e) => setCustomCameraAngle(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customCameraAngle" value="" />
          )}
        </div>

        {/* Aspect ratio + resolution */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-foreground/90">
              Aspect ratio
            </label>
            <select
              id="aspectRatio"
              name="aspectRatio"
              className={selectClass}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt || "default"} value={opt}>
                  {ASPECT_RATIO_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="resolution" className="block text-sm font-medium text-foreground/90">
              Resolution
            </label>
            <select
              id="resolution"
              name="resolution"
              className={selectClass}
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
            >
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt || "default"} value={opt}>
                  {RESOLUTION_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {state.error ? (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {state.error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <SubmitButton hasResult={Boolean(resultUrl)} />
      </div>

      {/* -------------------- RIGHT: result placeholder -------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground/80">Generated image</h3>
          {resultUrl ? (
            <a
              href={resultUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download
            </a>
          ) : null}
        </div>

        <ResultPlaceholder resultUrl={resultUrl} />

        <p className="text-xs text-muted-foreground">
          Your prompt and generated media are saved automatically to your account.
        </p>
      </div>
    </motion.form>
  );
}

function ResultPlaceholder({ resultUrl }: { resultUrl: string | null }) {
  const { pending } = useFormStatus();

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/8 bg-white/3">
      <AnimatePresence mode="wait">
        {resultUrl ? (
          <motion.img
            key={resultUrl}
            src={resultUrl}
            alt="Generated product image"
            className="h-full w-full object-contain"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : (
          <motion.div
            key="placeholder"
            className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-full border border-white/8 bg-white/5 p-4 animate-float">
              <Sparkles className="h-8 w-8 text-violet-400/60" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground/70">
              Your refined product image will appear here.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {pending ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm"
          >
            {/* Animated gradient ring */}
            <div className="relative h-16 w-16">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0%, #a78bfa 50%, transparent 100%)",
                  animation: "spin 1.2s linear infinite",
                }}
              />
              <div className="absolute inset-1 rounded-full bg-black/80 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-violet-400 animate-glow-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Refining your image…</p>
              <p className="mt-0.5 text-xs text-muted-foreground">This can take 20–60 seconds.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

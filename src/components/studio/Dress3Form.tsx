"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Box, Download, ImagePlus, Loader2 } from "lucide-react";

import {
  generateDress3DModel,
  type Dress3dGenState,
} from "@/lib/actions/dress3d";
import { GlbViewer } from "@/components/studio/GlbViewer";

const initialState: Dress3dGenState = {};

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
          Reconstructing mesh…
        </>
      ) : (
        <>
          <Box className="h-4 w-4" />
          Generate 3D model
        </>
      )}
    </button>
  );
}

type Props = {
  campaignId: string;
  /** Refined hero image — used as the primary `image_urls[0]` server-side. */
  heroImageUrl: string | null;
  /** Currently displayed GLB URL (selected from the gallery, or freshly generated). */
  displayGlbUrl: string | null;
  onArtifactsUpdated?: () => void | Promise<void>;
};

export function Dress3Form({
  campaignId,
  heroImageUrl,
  displayGlbUrl,
  onArtifactsUpdated,
}: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    generateDress3DModel,
    initialState
  );

  const glbUrl = state.artifact?.url ?? displayGlbUrl ?? null;

  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (state.artifact?.id && state.artifact.id !== seen.current) {
      seen.current = state.artifact.id;
      void onArtifactsUpdated?.();
      router.refresh();
    }
  }, [state.artifact?.id, router, onArtifactsUpdated]);

  const [blob2, setBlob2] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onSecond(evt: React.ChangeEvent<HTMLInputElement>) {
    const f = evt.target.files?.[0];
    if (blob2) URL.revokeObjectURL(blob2);
    setBlob2(f ? URL.createObjectURL(f) : null);
  }

  useEffect(() => {
    return () => {
      if (blob2) URL.revokeObjectURL(blob2);
    };
  }, [blob2]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Uses your refined product photo as the primary reference. Optionally
          add a second viewpoint or flat-lay so the fal Dress-3D workflow can
          fuse more geometry cues — you&apos;ll receive an interactive GLB mesh.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reference images</label>
          <div className="grid grid-cols-2 gap-3">
            {/* Primary hero — read-only */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
              <div className="aspect-square w-full bg-black/30">
                {heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImageUrl}
                    alt="Refined hero"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Refined image required
                  </div>
                )}
              </div>
              <p className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-violet-300/80">
                Primary · auto-included
              </p>
            </div>

            {/* Optional secondary upload */}
            <div className="overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/3">
              <input
                ref={fileRef}
                type="file"
                name="dress3dSecondaryImage"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onSecond}
              />
              {blob2 ? (
                <>
                  <div className="aspect-square w-full bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blob2}
                      alt="Secondary reference"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 px-2 py-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="font-medium text-violet-300 underline-offset-2 hover:underline"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileRef.current) fileRef.current.value = "";
                        if (blob2) URL.revokeObjectURL(blob2);
                        setBlob2(null);
                      }}
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-white/5"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="px-2 text-center text-xs">
                    Add another angle / flat-lay
                  </span>
                </button>
              )}
            </div>
          </div>
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
          <span className="text-sm font-medium text-foreground/80">
            Interactive mesh
          </span>
          {glbUrl ? (
            <a
              href={glbUrl}
              download={`vendora-model-${campaignId.slice(0, 8)}.glb`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" />
              Download GLB
            </a>
          ) : null}
        </div>
        {glbUrl ? (
          <GlbViewer url={glbUrl} />
        ) : (
          <div className="flex h-[min(440px,70vh)] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-muted-foreground">
            GLB renders here after workflow completion.
          </div>
        )}
      </div>
    </form>
  );
}

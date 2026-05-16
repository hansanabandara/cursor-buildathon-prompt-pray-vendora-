"use client";

import { useState } from "react";
import { Box, Film, ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { VideoForm } from "@/components/studio/VideoForm";
import {
  MEDIA_MODES,
  MEDIA_MODE_LABELS,
  type MediaMode,
} from "@/lib/studio/videoTypes";
import type { CampaignVideo } from "@/lib/actions/video";

type Props = {
  campaignId: string;
  videos: CampaignVideo[];
};

const ICONS: Record<MediaMode, React.ComponentType<{ className?: string }>> = {
  poster: ImageIcon,
  "3d": Box,
  video: Film,
};

export function MediaCreationPanel({ campaignId, videos }: Props) {
  const [mode, setMode] = useState<MediaMode>("video");
  const latestVideo = videos[0] ?? null;

  return (
    <section className="space-y-6 rounded-2xl glass-strong p-6 shadow-xl shadow-black/20">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-violet-400" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight text-gradient">
            Media creation
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The refined product image is ready. Generate marketing media from it
          — poster artwork, an interactive 3D model, or a short video ad.
        </p>
      </div>

      {/* Media-mode toggle with animated active indicator */}
      <div className="relative grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
        {MEDIA_MODES.map((m) => {
          const Icon = ICONS[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              {isActive ? (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 border border-white/12"
                  transition={{ type: "spring", stiffness: 400, damping: 38 }}
                />
              ) : null}
              <span className={`relative z-10 flex items-center gap-2 ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {MEDIA_MODE_LABELS[m]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content with crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {mode === "video" ? (
            <VideoForm campaignId={campaignId} latestVideo={latestVideo} />
          ) : (
            <ComingSoon mode={mode} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Previous videos gallery */}
      {mode === "video" && videos.length > 0 ? (
        <VideoGallery videos={videos} />
      ) : null}
    </section>
  );
}

function ComingSoon({ mode }: { mode: MediaMode }) {
  const Icon = ICONS[mode];
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/3 p-12 text-center">
      <div className="rounded-full border border-white/10 bg-white/5 p-4 animate-float">
        <Icon className="h-8 w-8 text-violet-400/60" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground/80">
          {MEDIA_MODE_LABELS[mode]} generation coming soon
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          We&apos;re wiring up the {MEDIA_MODE_LABELS[mode].toLowerCase()}{" "}
          workflow next. Switch to <strong className="text-foreground/60">Video</strong> to create
          marketing media from this campaign.
        </p>
      </div>
    </div>
  );
}

function VideoGallery({ videos }: { videos: CampaignVideo[] }) {
  return (
    <div className="space-y-3 border-t border-white/8 pt-6">
      <h3 className="text-sm font-semibold text-foreground/80">Previously generated videos</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
          >
            <GalleryCard video={v} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GalleryCard({ video: v }: { video: CampaignVideo }) {
  const createdAt = new Date(v.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const platformLabel = v.platform
    ? v.platform === "custom"
      ? "custom"
      : v.platform
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/3 transition-all hover:border-white/14 hover:shadow-md hover:shadow-black/20">
      <div className="aspect-square bg-white/3">
        {v.video_url && v.status === "completed" ? (
          <video
            src={v.video_url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center text-xs">
            {v.status === "processing" ? (
              <>
                <Loader2
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">Rendering…</span>
              </>
            ) : v.status === "failed" ? (
              <>
                <span className="font-medium text-destructive">
                  Generation failed
                </span>
                {v.error_message ? (
                  <span
                    className="line-clamp-3 text-muted-foreground"
                    title={v.error_message}
                  >
                    {v.error_message}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">No preview</span>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium capitalize">
            {v.mode}
            {platformLabel ? ` · ${platformLabel}` : ""}
          </span>
          <span
            className={
              v.status === "completed"
                ? "text-emerald-400"
                : v.status === "failed"
                  ? "text-destructive"
                  : "text-amber-400"
            }
          >
            {v.status}
          </span>
        </div>
        <p className="text-muted-foreground">
          {v.aspect_ratio} · {v.resolution} ·{" "}
          {v.duration === "auto" ? "auto" : `${v.duration}s`}
        </p>
        <p className="text-muted-foreground">{createdAt}</p>
        {v.video_url && v.status === "completed" ? (
          <a
            href={v.video_url}
            target="_blank"
            rel="noreferrer"
            download
            className="inline-block pt-1 font-medium text-violet-400 underline-offset-2 hover:underline hover:text-violet-300"
          >
            Download
          </a>
        ) : null}
      </div>
    </div>
  );
}

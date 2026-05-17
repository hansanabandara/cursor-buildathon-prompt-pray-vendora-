"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Box, Film, ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { PosterForm } from "@/components/studio/PosterForm";
import { Dress3Form } from "@/components/studio/Dress3Form";
import { VideoForm } from "@/components/studio/VideoForm";
import {
  fetchPosterAndModelArtifacts,
  type CampaignArtifactRow,
} from "@/lib/actions/campaignArtifacts";
import {
  MEDIA_MODES,
  MEDIA_MODE_LABELS,
  type MediaMode,
} from "@/lib/studio/videoTypes";
import type { CampaignVideo } from "@/lib/actions/video";

type Props = {
  campaignId: string;
  /** Refined hero frame — shown beside optional Dress-3D upload */
  heroImageUrl: string | null;
  videos: CampaignVideo[];
  posters: CampaignArtifactRow[];
  models3d: CampaignArtifactRow[];
};

const ICONS: Record<MediaMode, React.ComponentType<{ className?: string }>> = {
  poster: ImageIcon,
  "3d": Box,
  video: Film,
};

export function MediaCreationPanel({
  campaignId,
  heroImageUrl,
  videos,
  posters,
  models3d,
}: Props) {
  const [mode, setMode] = useState<MediaMode>("video");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const [posterRows, setPosterRows] = useState(posters);
  const [modelsRows, setModelsRows] = useState(models3d);

  const posterStamp =
    posters.length === 0
      ? "0"
      : posters.map((p) => `${p.id}:${p.url}`).join("|");

  const modelStamp =
    models3d.length === 0
      ? "0"
      : models3d.map((p) => `${p.id}:${p.url}`).join("|");

  useEffect(() => {
    setPosterRows(posters);
    setModelsRows(models3d);
    // `posterStamp` / `modelStamp` collapse the array contents into stable
    // strings so we resync only when ids/urls actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, posterStamp, modelStamp]);

  const refreshArtifacts = useCallback(async () => {
    try {
      const next = await fetchPosterAndModelArtifacts(campaignId);
      setPosterRows(next.posters);
      setModelsRows(next.models3d);
    } catch {
      /* non-fatal */
    }
  }, [campaignId]);

  useEffect(() => {
    void refreshArtifacts();
  }, [refreshArtifacts]);

  const latestVideo = videos[0] ?? null;
  const latestPoster = posterRows[0] ?? null;
  const latestModel = modelsRows[0] ?? null;

  const activeModel =
    modelsRows.find((m) => m.id === selectedModelId) ?? latestModel;
  const activeModelUrl = activeModel?.url ?? null;

  useEffect(() => {
    if (!latestModel) return;
    setSelectedModelId((prev) => {
      if (!prev) return latestModel.id;
      if (modelsRows.some((m) => m.id === prev)) return prev;
      return latestModel.id;
    });
  }, [latestModel, modelsRows]);

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
          — posters, Dress-3D meshes, or a short video ad.
        </p>
      </div>

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
                  className="absolute inset-0 rounded-lg border border-white/12 bg-white/10"
                  transition={{ type: "spring", stiffness: 400, damping: 38 }}
                />
              ) : null}
              <span
                className={`relative z-10 flex items-center gap-2 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {MEDIA_MODE_LABELS[m]}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-6"
        >
          {mode === "video" ? (
            <VideoForm campaignId={campaignId} latestVideo={latestVideo} />
          ) : null}
          {mode === "poster" ? (
            <PosterForm
              campaignId={campaignId}
              latestPoster={latestPoster}
              onArtifactsUpdated={refreshArtifacts}
            />
          ) : null}
          {mode === "3d" ? (
            <Dress3Form
              campaignId={campaignId}
              heroImageUrl={heroImageUrl}
              displayGlbUrl={activeModelUrl}
              onArtifactsUpdated={refreshArtifacts}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {mode === "video" && videos.length > 0 ? (
        <VideoGallery videos={videos} />
      ) : null}
      {mode === "poster" && posterRows.length > 0 ? (
        <ArtifactStrip
          title="Previous posters"
          items={posterRows}
          renderPreview={(row) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.url}
              alt="Poster"
              className="h-full w-full object-cover"
            />
          )}
        />
      ) : null}
      {mode === "3d" && modelsRows.length > 0 ? (
        <ModelGallery
          items={modelsRows}
          selectedId={selectedModelId}
          onSelect={setSelectedModelId}
        />
      ) : null}
    </section>
  );
}

function VideoGallery({ videos }: { videos: CampaignVideo[] }) {
  return (
    <div className="space-y-3 border-t border-white/8 pt-6">
      <h3 className="text-sm font-semibold text-foreground/80">
        Previously generated videos
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
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
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/3 transition-all hover:border-white/14">
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
            className="inline-block pt-1 font-medium text-violet-400 underline-offset-2 hover:text-violet-300 hover:underline"
          >
            Download
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ModelGallery({
  items,
  selectedId,
  onSelect,
}: {
  items: CampaignArtifactRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.div
      className="space-y-3 border-t border-white/8 pt-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-sm font-semibold text-foreground/80">
        Previous 3D models — click to preview
      </h3>
      <motion.div
        className="flex gap-3 overflow-x-auto pb-1"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
        initial="hidden"
        animate="show"
      >
        {items.map((row) => {
          const selected = row.id === selectedId;
          return (
            <motion.button
              key={row.id}
              type="button"
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              onClick={() => onSelect(row.id)}
              className={
                "block w-32 shrink-0 overflow-hidden rounded-lg border text-left transition " +
                (selected
                  ? "border-violet-500/60 ring-2 ring-violet-500/30"
                  : "border-white/10 bg-white/5 hover:border-violet-500/40")
              }
            >
              <div className="flex aspect-square w-full items-center justify-center bg-black/50 text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
                GLB
              </div>
              <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
                {new Date(row.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function ArtifactStrip({
  title,
  items,
  renderPreview,
}: {
  title: string;
  items: CampaignArtifactRow[];
  renderPreview: (row: CampaignArtifactRow) => ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-white/8 pt-6">
      <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((row) => (
          <a
            key={row.id}
            href={row.url}
            target="_blank"
            rel="noreferrer"
            download
            className="block w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 transition hover:border-violet-500/40"
          >
            <div className="aspect-square w-full">{renderPreview(row)}</div>
            <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
              {new Date(row.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

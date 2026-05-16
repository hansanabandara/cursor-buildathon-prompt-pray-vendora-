"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Film, Loader2, Sparkles } from "lucide-react";

import {
  generateCampaignVideo,
  type CampaignVideo,
  type VideoGenState,
} from "@/lib/actions/video";
import {
  BACKGROUND_MUSIC_LABELS,
  BACKGROUND_MUSIC_OPTIONS,
  COLOR_PALETTE_LABELS,
  COLOR_PALETTE_OPTIONS,
  PLATFORM_LABELS,
  PLATFORM_OPTIONS,
  PLATFORM_PRESETS,
  TALKING_STYLE_LABELS,
  TALKING_STYLE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  VIDEO_MODES,
  VIDEO_MODE_LABELS,
  VIDEO_RESOLUTION_OPTIONS,
  VIDEO_STYLE_LABELS,
  VIDEO_STYLE_OPTIONS,
  type BackgroundMusic,
  type ColorPalette,
  type Platform,
  type TalkingStyle,
  type Theme,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoMode,
  type VideoResolution,
  type VideoStyle,
} from "@/lib/studio/videoTypes";

const initialState: VideoGenState = {};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Rendering video...
        </>
      ) : (
        <>
          <Film className="h-4 w-4" aria-hidden="true" />
          Generate video
        </>
      )}
    </button>
  );
}

type Props = {
  campaignId: string;
  // If the user just generated a video in this session we hand it back so the
  // player can autoplay it.
  latestVideo: CampaignVideo | null;
};

export function VideoForm({ campaignId, latestVideo }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    generateCampaignVideo,
    initialState
  );

  // The result video we show in the right-hand pane: either from this session
  // or the most recent saved one.
  const resultVideo = state.video ?? latestVideo ?? null;

  // After a successful generation, the Server Action revalidates the route,
  // but the *current* page render still holds the stale `videos` prop. Force
  // a server data refresh so the "Previously generated videos" gallery picks
  // up the new entry. We track the last-seen video id so this only fires once
  // per generation (not on every re-render).
  const lastRefreshedId = useRef<string | null>(null);
  useEffect(() => {
    if (state.video && state.video.id !== lastRefreshedId.current) {
      lastRefreshedId.current = state.video.id;
      router.refresh();
    }
  }, [state.video, router]);

  const [mode, setMode] = useState<VideoMode>("showcase");

  // Common workflow inputs
  const [duration, setDuration] = useState<VideoDuration>("auto");
  const [resolution, setResolution] = useState<VideoResolution>("720p");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("auto");
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);

  // Styling
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("cinematic");
  const [customVideoStyle, setCustomVideoStyle] = useState("");
  const [colorPalette, setColorPalette] = useState<ColorPalette>("default");
  const [customColorPalette, setCustomColorPalette] = useState("");
  const [theme, setTheme] = useState<Theme>("modern_minimal");
  const [customTheme, setCustomTheme] = useState("");
  const [backgroundMusic, setBackgroundMusic] =
    useState<BackgroundMusic>("ambient_chill");
  const [customBackgroundMusic, setCustomBackgroundMusic] = useState("");
  const [talkingStyle, setTalkingStyle] = useState<TalkingStyle>("none");
  const [customTalkingStyle, setCustomTalkingStyle] = useState("");

  // Ad-only
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [customPlatform, setCustomPlatform] = useState("");

  const [customBrief, setCustomBrief] = useState("");

  // Re-apply platform presets when platform changes IN ad mode.
  useEffect(() => {
    if (mode !== "advertisement") return;
    const p = PLATFORM_PRESETS[platform];
    setAspectRatio(p.aspectRatio);
    setResolution(p.resolution);
    setDuration(p.duration);
    setVideoStyle(p.videoStyle);
    setColorPalette(p.colorPalette);
    setTheme(p.theme);
    setBackgroundMusic(p.backgroundMusic);
    setTalkingStyle(p.talkingStyle);
  }, [platform, mode]);

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr,1.1fr]">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="space-y-6">
        {/* Mode tabs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Video purpose</label>
          <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-1">
            {VIDEO_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "rounded-sm px-3 py-2 text-sm font-medium transition-colors " +
                  (mode === m
                    ? "bg-background shadow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {VIDEO_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <input type="hidden" name="mode" value={mode} />
          <p className="text-xs text-muted-foreground">
            {mode === "showcase"
              ? "Showcase: product-focused, no voiceover, music + style only."
              : "Advertisement: platform-tuned, scripted, with voiceover styling."}
          </p>
        </div>

        {/* Advertisement-only: platform */}
        {mode === "advertisement" ? (
          <div className="space-y-2">
            <label htmlFor="platform" className="text-sm font-medium">
              Platform
            </label>
            <select
              id="platform"
              name="platform"
              className={selectClass}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Selecting a platform applies its recommended aspect ratio,
              resolution, style and music — you can still override anything
              below.
            </p>
            {platform === "custom" ? (
              <input
                name="customPlatform"
                required
                placeholder="Describe the target platform..."
                className={selectClass}
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
              />
            ) : (
              <input type="hidden" name="customPlatform" value="" />
            )}
          </div>
        ) : (
          <>
            <input type="hidden" name="platform" value="" />
            <input type="hidden" name="customPlatform" value="" />
          </>
        )}

        {/* Duration / Resolution / Aspect (workflow-native) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duration
            </label>
            <select
              id="duration"
              name="duration"
              className={selectClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value as VideoDuration)}
            >
              {VIDEO_DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d === "auto" ? "Auto" : `${d}s`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="resolution" className="text-sm font-medium">
              Resolution
            </label>
            <select
              id="resolution"
              name="resolution"
              className={selectClass}
              value={resolution}
              onChange={(e) =>
                setResolution(e.target.value as VideoResolution)
              }
            >
              {VIDEO_RESOLUTION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="aspectRatio" className="text-sm font-medium">
              Aspect ratio
            </label>
            <select
              id="aspectRatio"
              name="aspectRatio"
              className={selectClass}
              value={aspectRatio}
              onChange={(e) =>
                setAspectRatio(e.target.value as VideoAspectRatio)
              }
            >
              {VIDEO_ASPECT_RATIO_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a === "auto" ? "Auto" : a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Video style */}
        <div className="space-y-2">
          <label htmlFor="videoStyle" className="text-sm font-medium">
            Video style
          </label>
          <select
            id="videoStyle"
            name="videoStyle"
            className={selectClass}
            value={videoStyle}
            onChange={(e) => setVideoStyle(e.target.value as VideoStyle)}
          >
            {VIDEO_STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {VIDEO_STYLE_LABELS[s]}
              </option>
            ))}
          </select>
          {videoStyle === "custom" ? (
            <textarea
              name="customVideoStyle"
              required
              className={textareaClass}
              placeholder="Describe the video style..."
              value={customVideoStyle}
              onChange={(e) => setCustomVideoStyle(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customVideoStyle" value="" />
          )}
        </div>

        {/* Color palette + Theme (side by side) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="colorPalette" className="text-sm font-medium">
              Color palette
            </label>
            <select
              id="colorPalette"
              name="colorPalette"
              className={selectClass}
              value={colorPalette}
              onChange={(e) =>
                setColorPalette(e.target.value as ColorPalette)
              }
            >
              {COLOR_PALETTE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {COLOR_PALETTE_LABELS[c]}
                </option>
              ))}
            </select>
            {colorPalette === "custom" ? (
              <textarea
                name="customColorPalette"
                required
                className={textareaClass}
                placeholder="Describe the palette..."
                value={customColorPalette}
                onChange={(e) => setCustomColorPalette(e.target.value)}
              />
            ) : (
              <input type="hidden" name="customColorPalette" value="" />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="theme" className="text-sm font-medium">
              Theme
            </label>
            <select
              id="theme"
              name="theme"
              className={selectClass}
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {THEME_LABELS[t]}
                </option>
              ))}
            </select>
            {theme === "custom" ? (
              <textarea
                name="customTheme"
                required
                className={textareaClass}
                placeholder="Describe the theme..."
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
              />
            ) : (
              <input type="hidden" name="customTheme" value="" />
            )}
          </div>
        </div>

        {/* Background music */}
        <div className="space-y-2">
          <label htmlFor="backgroundMusic" className="text-sm font-medium">
            Background music
          </label>
          <select
            id="backgroundMusic"
            name="backgroundMusic"
            className={selectClass}
            value={backgroundMusic}
            onChange={(e) =>
              setBackgroundMusic(e.target.value as BackgroundMusic)
            }
          >
            {BACKGROUND_MUSIC_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {BACKGROUND_MUSIC_LABELS[m]}
              </option>
            ))}
          </select>
          {backgroundMusic === "custom" ? (
            <textarea
              name="customBackgroundMusic"
              required
              className={textareaClass}
              placeholder="Describe the music..."
              value={customBackgroundMusic}
              onChange={(e) => setCustomBackgroundMusic(e.target.value)}
            />
          ) : (
            <input type="hidden" name="customBackgroundMusic" value="" />
          )}
        </div>

        {/* Talking style (ad mode only) */}
        {mode === "advertisement" ? (
          <div className="space-y-2">
            <label htmlFor="talkingStyle" className="text-sm font-medium">
              Voiceover / talking style
            </label>
            <select
              id="talkingStyle"
              name="talkingStyle"
              className={selectClass}
              value={talkingStyle}
              onChange={(e) =>
                setTalkingStyle(e.target.value as TalkingStyle)
              }
            >
              {TALKING_STYLE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TALKING_STYLE_LABELS[t]}
                </option>
              ))}
            </select>
            {talkingStyle === "custom" ? (
              <textarea
                name="customTalkingStyle"
                required
                className={textareaClass}
                placeholder="Describe the voiceover style..."
                value={customTalkingStyle}
                onChange={(e) => setCustomTalkingStyle(e.target.value)}
              />
            ) : (
              <input type="hidden" name="customTalkingStyle" value="" />
            )}
          </div>
        ) : (
          <>
            <input type="hidden" name="talkingStyle" value="none" />
            <input type="hidden" name="customTalkingStyle" value="" />
          </>
        )}

        {/* Generate audio toggle */}
        <label
          htmlFor="generateAudio"
          className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
        >
          <input
            id="generateAudio"
            name="generateAudio"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input"
            checked={generateAudio}
            onChange={(e) => setGenerateAudio(e.target.checked)}
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Generate audio</span>
            <span className="block text-xs text-muted-foreground">
              Sync sound effects, ambient sound, and voiceover (if a talking
              style is selected) with the video.
            </span>
          </span>
        </label>

        {/* Custom brief (free-form) */}
        <div className="space-y-2">
          <label htmlFor="customBrief" className="text-sm font-medium">
            Additional brief (optional)
          </label>
          <textarea
            id="customBrief"
            name="customBrief"
            className={textareaClass}
            placeholder="Anything else the director should know..."
            value={customBrief}
            onChange={(e) => setCustomBrief(e.target.value)}
          />
        </div>

        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        <GenerateButton />
      </div>

      {/* RIGHT: video result */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Generated video</h3>
          {resultVideo?.video_url ? (
            <a
              href={resultVideo.video_url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          ) : null}
        </div>

        <VideoPlaceholder video={resultVideo} />

        <p className="text-xs text-muted-foreground">
          Video rendering can take 1–4 minutes depending on duration and
          resolution. The result is saved to your account automatically.
        </p>
      </div>
    </form>
  );
}

function VideoPlaceholder({ video }: { video: CampaignVideo | null }) {
  const { pending } = useFormStatus();

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted/30">
      {video?.video_url ? (
        <video
          src={video.video_url}
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Sparkles className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm">
            Your generated video will appear here.
          </p>
        </div>
      )}

      {pending ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium">Rendering your video...</p>
          <p className="text-xs text-muted-foreground">
            This can take 1–4 minutes.
          </p>
        </div>
      ) : null}
    </div>
  );
}

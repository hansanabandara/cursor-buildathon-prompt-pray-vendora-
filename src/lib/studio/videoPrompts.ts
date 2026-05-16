import {
  type BackgroundMusic,
  type ColorPalette,
  type Platform,
  type TalkingStyle,
  type Theme,
  type VideoMode,
  type VideoStyle,
} from "./videoTypes";

// ---- Style fragments -----------------------------------------------------

const VIDEO_STYLE_PROMPTS: Record<Exclude<VideoStyle, "custom">, string> = {
  cinematic:
    "Cinematic feel with smooth camera moves, depth of field, motion blur and filmic colour grading.",
  dynamic_product:
    "Dynamic product showcase with quick punchy reveals, sweeping rotations, hero close-ups and energetic motion.",
  lifestyle:
    "Warm lifestyle vibe placing the product in a believable real-world context with natural motion.",
  minimal:
    "Minimalist composition with a single deliberate camera move and uncluttered framing.",
  luxurious:
    "Slow, deliberate luxury feel with elegant lighting, subtle reflections and premium pacing.",
  energetic:
    "High-energy edit with rapid camera moves, bursts of motion and a punchy, hype-driven flow.",
  documentary:
    "Documentary realism with handheld micro-movements, natural lighting and an honest, observational tone.",
};

const COLOR_PALETTE_PROMPTS: Record<Exclude<ColorPalette, "custom">, string> = {
  default: "",
  vibrant:
    "Saturated, vibrant colour palette with punchy contrast.",
  monochrome:
    "Strict monochrome palette built around the product's primary colour with subtle tonal variation.",
  pastel: "Soft pastel palette with gentle, airy tones.",
  neon: "Glowing neon palette with magenta, cyan and electric blue accents.",
  warm_earth:
    "Warm earth tones — terracotta, ochre, cream and soft browns.",
  cool_blues:
    "Cool palette dominated by deep blues, teals and slate greys.",
  luxury_gold:
    "Luxury palette of champagne gold, deep charcoal and warm ivory highlights.",
};

const THEME_PROMPTS: Record<Exclude<Theme, "custom">, string> = {
  modern_minimal:
    "Modern minimal aesthetic with clean lines and ample negative space.",
  luxury:
    "High-end luxury aesthetic with premium materials, elegant typography vibes and refined polish.",
  playful:
    "Playful, fun aesthetic with bouncy motion and friendly energy.",
  tech: "Tech-forward aesthetic with sleek surfaces, subtle UI glow and futuristic precision.",
  organic:
    "Organic, natural aesthetic with soft textures, daylight and earthy materials.",
  sporty:
    "Athletic, sporty aesthetic with bold motion lines and energetic pacing.",
  retro:
    "Retro aesthetic with film grain, warm tones and 1980s-style framing.",
  futuristic:
    "Futuristic aesthetic with high-tech surfaces, holographic accents and clean sci-fi polish.",
};

const BACKGROUND_MUSIC_PROMPTS: Record<
  Exclude<BackgroundMusic, "custom" | "none">,
  string
> = {
  upbeat_pop: "upbeat pop background music with a catchy hook",
  ambient_chill: "calm ambient chill background music with soft pads",
  electronic_energetic:
    "energetic electronic background music with driving synths and tight percussion",
  corporate_inspirational:
    "uplifting corporate inspirational background music with piano and warm strings",
  lofi_warm: "warm lo-fi background music with vinyl-style texture",
  epic_orchestral: "epic orchestral background music with cinematic swells",
};

const TALKING_STYLE_PROMPTS: Record<
  Exclude<TalkingStyle, "custom" | "none">,
  string
> = {
  enthusiastic: "enthusiastic, high-energy voiceover that builds hype",
  calm_narrator: "calm, measured narrator voiceover",
  authoritative: "confident, authoritative voiceover with weight and clarity",
  friendly_conversational:
    "friendly conversational voiceover, warm and approachable",
  dramatic: "dramatic, cinematic voiceover with emotional swells",
  playful: "playful, witty voiceover with a light, fun tone",
};

const PLATFORM_PROMPTS: Record<Exclude<Platform, "custom">, string> = {
  instagram:
    "Optimised for Instagram Reels: hook within the first second, vertical framing, scroll-stopping visuals.",
  facebook:
    "Optimised for Facebook feed playback: works with sound on or off, clear product moment in the first 3 seconds.",
  youtube:
    "Optimised for YouTube: cinematic widescreen pacing with a strong opening and a clean call to action at the end.",
  x: "Optimised for X (Twitter): short, punchy, attention-grabbing, autoplay-friendly with no-sound clarity.",
  tiktok:
    "Optimised for TikTok: native vertical feel, fast hook, trend-aware energy, lo-fi authenticity over polish.",
};

// ---- Inputs --------------------------------------------------------------

export type VideoPromptInputs = {
  productName: string;
  // The composed prompt from the image refinement step — kept as visual ground
  // truth so the video matches the refined image's look.
  imagePrompt: string | null;

  mode: VideoMode;

  videoStyle: VideoStyle;
  customVideoStyle?: string | null;

  colorPalette: ColorPalette;
  customColorPalette?: string | null;

  theme: Theme;
  customTheme?: string | null;

  backgroundMusic: BackgroundMusic;
  customBackgroundMusic?: string | null;

  talkingStyle: TalkingStyle;
  customTalkingStyle?: string | null;

  // Advertisement-only
  platform?: Platform | null;
  customPlatform?: string | null;

  generateAudio: boolean;
  duration: string; // workflow enum already validated upstream
  aspectRatio: string;

  customBrief?: string | null;
};

// ---- Composition ---------------------------------------------------------

function pickStyle(input: VideoPromptInputs): string {
  return input.videoStyle === "custom"
    ? (input.customVideoStyle?.trim() ?? "")
    : VIDEO_STYLE_PROMPTS[input.videoStyle];
}

function pickColor(input: VideoPromptInputs): string {
  return input.colorPalette === "custom"
    ? (input.customColorPalette?.trim() ?? "")
    : COLOR_PALETTE_PROMPTS[input.colorPalette];
}

function pickTheme(input: VideoPromptInputs): string {
  return input.theme === "custom"
    ? (input.customTheme?.trim() ?? "")
    : THEME_PROMPTS[input.theme];
}

function pickMusic(input: VideoPromptInputs): string {
  if (input.backgroundMusic === "none") return "No background music — silent.";
  if (input.backgroundMusic === "custom") {
    const v = input.customBackgroundMusic?.trim();
    return v ? `Background music: ${v}.` : "";
  }
  return `Background music: ${BACKGROUND_MUSIC_PROMPTS[input.backgroundMusic]}.`;
}

function pickTalking(input: VideoPromptInputs): string {
  if (input.talkingStyle === "none") {
    return "No spoken voiceover — let visuals and music carry the message.";
  }
  if (input.talkingStyle === "custom") {
    const v = input.customTalkingStyle?.trim();
    return v ? `Voiceover style: ${v}.` : "";
  }
  return `Voiceover style: ${TALKING_STYLE_PROMPTS[input.talkingStyle]}.`;
}

function pickPlatform(input: VideoPromptInputs): string {
  if (input.mode !== "advertisement" || !input.platform) return "";
  if (input.platform === "custom") {
    const v = input.customPlatform?.trim();
    return v ? `Target platform: ${v}.` : "";
  }
  return PLATFORM_PROMPTS[input.platform];
}

/**
 * Build the full prompt for the fal `video-and-text` workflow.
 *
 * The workflow itself fans out into a "Commercial Director" sub-prompt that
 * expects a brief — so we hand it a richly structured natural-language brief
 * containing the original image's prompt, the chosen styling and the desired
 * pacing.
 */
export function composeVideoPrompt(input: VideoPromptInputs): string {
  // The downstream workflow uses a Claude "Commercial Director" that expects
  // a SHORT creative brief and emits a strict [Script] / [Text to Speech] /
  // [Voice] document. If we hand it a long prescriptive brief, Claude tends
  // to "review" it instead of generating the structured plan, which breaks
  // the voice extractor and tanks the Kokoro TTS step.
  //
  // Keep this concise: one line per signal, no markdown, no headings.
  const durationStr =
    input.duration === "auto" ? "short" : `${input.duration}-second`;
  const verb = input.mode === "advertisement" ? "advertisement" : "showcase";

  const lines: Array<string | null | undefined> = [
    `Product: ${input.productName}.`,
    `Goal: a ${durationStr} ${verb} video.`,
    input.imagePrompt
      ? `Reference image style: ${truncate(input.imagePrompt, 220)}`
      : null,
    oneLine("Style", pickStyle(input)),
    oneLine("Color", pickColor(input)),
    oneLine("Theme", pickTheme(input)),
    oneLine("Platform", pickPlatform(input)),
    oneLine("Music", stripPrefix(pickMusic(input), "Background music: ")),
    input.mode === "advertisement"
      ? oneLine("Voiceover", stripPrefix(pickTalking(input), "Voiceover style: "))
      : null,
    input.customBrief?.trim()
      ? `Client brief: ${truncate(input.customBrief.trim(), 400)}`
      : null,
    input.generateAudio
      ? "Audio: include synchronised sound and voiceover."
      : "Audio: silent.",
    "Preserve the product's exact identity, colours, proportions and any text shown in the reference image. Camera moves in service of the product, never deforms it.",
  ];

  return lines
    .filter((b): b is string => Boolean(b) && b!.trim().length > 0)
    .join("\n");
}

function oneLine(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${label}: ${trimmed}`;
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length).replace(/\.$/, "") : value;
}

function truncate(value: string, n: number): string {
  return value.length > n ? value.slice(0, n).trimEnd() + "…" : value;
}

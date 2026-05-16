// ---------------------------------------------------------------------------
// Media-creation type system (Vendora Studio, phase 2)
// ---------------------------------------------------------------------------
// Everything here is plain TS + data tables: enums, human labels, prompt
// snippets, and platform presets.  No React, no Supabase, no fal SDK.
// ---------------------------------------------------------------------------

export const MEDIA_MODES = ["poster", "3d", "video"] as const;
export type MediaMode = (typeof MEDIA_MODES)[number];

export const MEDIA_MODE_LABELS: Record<MediaMode, string> = {
  poster: "Poster",
  "3d": "3D model",
  video: "Video",
};

// ---- Video subtype -------------------------------------------------------

export const VIDEO_MODES = ["showcase", "advertisement"] as const;
export type VideoMode = (typeof VIDEO_MODES)[number];

export const VIDEO_MODE_LABELS: Record<VideoMode, string> = {
  showcase: "Showcase",
  advertisement: "Advertisement",
};

// ---- Workflow-native enums (must match the fal workflow schema) ---------

export const VIDEO_RESOLUTION_OPTIONS = ["480p", "720p", "1080p"] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTION_OPTIONS)[number];

export const VIDEO_DURATION_OPTIONS = [
  "auto",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
] as const;
export type VideoDuration = (typeof VIDEO_DURATION_OPTIONS)[number];

export const VIDEO_ASPECT_RATIO_OPTIONS = [
  "auto",
  "21:9",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
] as const;
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIO_OPTIONS)[number];

// ---- Style presets shared by both modes ---------------------------------

export const VIDEO_STYLE_OPTIONS = [
  "cinematic",
  "dynamic_product",
  "lifestyle",
  "minimal",
  "luxurious",
  "energetic",
  "documentary",
  "custom",
] as const;
export type VideoStyle = (typeof VIDEO_STYLE_OPTIONS)[number];

export const VIDEO_STYLE_LABELS: Record<VideoStyle, string> = {
  cinematic: "Cinematic",
  dynamic_product: "Dynamic product",
  lifestyle: "Lifestyle",
  minimal: "Minimal",
  luxurious: "Luxurious",
  energetic: "Energetic",
  documentary: "Documentary",
  custom: "Custom",
};

export const BACKGROUND_MUSIC_OPTIONS = [
  "none",
  "upbeat_pop",
  "ambient_chill",
  "electronic_energetic",
  "corporate_inspirational",
  "lofi_warm",
  "epic_orchestral",
  "custom",
] as const;
export type BackgroundMusic = (typeof BACKGROUND_MUSIC_OPTIONS)[number];

export const BACKGROUND_MUSIC_LABELS: Record<BackgroundMusic, string> = {
  none: "No music",
  upbeat_pop: "Upbeat pop",
  ambient_chill: "Ambient / chill",
  electronic_energetic: "Energetic electronic",
  corporate_inspirational: "Corporate inspirational",
  lofi_warm: "Lo-fi / warm",
  epic_orchestral: "Epic orchestral",
  custom: "Custom",
};

export const COLOR_PALETTE_OPTIONS = [
  "default",
  "vibrant",
  "monochrome",
  "pastel",
  "neon",
  "warm_earth",
  "cool_blues",
  "luxury_gold",
  "custom",
] as const;
export type ColorPalette = (typeof COLOR_PALETTE_OPTIONS)[number];

export const COLOR_PALETTE_LABELS: Record<ColorPalette, string> = {
  default: "Default (match product)",
  vibrant: "Vibrant",
  monochrome: "Monochrome",
  pastel: "Pastel",
  neon: "Neon",
  warm_earth: "Warm earth",
  cool_blues: "Cool blues",
  luxury_gold: "Luxury gold",
  custom: "Custom",
};

export const THEME_OPTIONS = [
  "modern_minimal",
  "luxury",
  "playful",
  "tech",
  "organic",
  "sporty",
  "retro",
  "futuristic",
  "custom",
] as const;
export type Theme = (typeof THEME_OPTIONS)[number];

export const THEME_LABELS: Record<Theme, string> = {
  modern_minimal: "Modern minimal",
  luxury: "Luxury",
  playful: "Playful",
  tech: "Tech",
  organic: "Organic / natural",
  sporty: "Sporty",
  retro: "Retro",
  futuristic: "Futuristic",
  custom: "Custom",
};

export const TALKING_STYLE_OPTIONS = [
  "none",
  "enthusiastic",
  "calm_narrator",
  "authoritative",
  "friendly_conversational",
  "dramatic",
  "playful",
  "custom",
] as const;
export type TalkingStyle = (typeof TALKING_STYLE_OPTIONS)[number];

export const TALKING_STYLE_LABELS: Record<TalkingStyle, string> = {
  none: "No voiceover",
  enthusiastic: "Enthusiastic",
  calm_narrator: "Calm narrator",
  authoritative: "Authoritative",
  friendly_conversational: "Friendly / conversational",
  dramatic: "Dramatic",
  playful: "Playful",
  custom: "Custom",
};

// ---- Platforms (advertisement mode only) ---------------------------------

export const PLATFORM_OPTIONS = [
  "instagram",
  "facebook",
  "youtube",
  "x",
  "tiktok",
  "custom",
] as const;
export type Platform = (typeof PLATFORM_OPTIONS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  x: "X (Twitter)",
  tiktok: "TikTok",
  custom: "Custom platform",
};

/**
 * Sensible defaults per platform. The UI applies these the moment the user
 * picks a platform, but every field is still individually editable
 * afterwards.
 */
export type PlatformPreset = {
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  duration: VideoDuration;
  videoStyle: VideoStyle;
  colorPalette: ColorPalette;
  theme: Theme;
  backgroundMusic: BackgroundMusic;
  talkingStyle: TalkingStyle;
};

export const PLATFORM_PRESETS: Record<Platform, PlatformPreset> = {
  instagram: {
    aspectRatio: "9:16",
    resolution: "1080p",
    duration: "9",
    videoStyle: "dynamic_product",
    colorPalette: "vibrant",
    theme: "modern_minimal",
    backgroundMusic: "upbeat_pop",
    talkingStyle: "enthusiastic",
  },
  facebook: {
    aspectRatio: "1:1",
    resolution: "1080p",
    duration: "10",
    videoStyle: "lifestyle",
    colorPalette: "warm_earth",
    theme: "modern_minimal",
    backgroundMusic: "corporate_inspirational",
    talkingStyle: "friendly_conversational",
  },
  youtube: {
    aspectRatio: "16:9",
    resolution: "1080p",
    duration: "15",
    videoStyle: "cinematic",
    colorPalette: "cool_blues",
    theme: "tech",
    backgroundMusic: "epic_orchestral",
    talkingStyle: "authoritative",
  },
  x: {
    aspectRatio: "16:9",
    resolution: "720p",
    duration: "7",
    videoStyle: "energetic",
    colorPalette: "vibrant",
    theme: "modern_minimal",
    backgroundMusic: "electronic_energetic",
    talkingStyle: "playful",
  },
  tiktok: {
    aspectRatio: "9:16",
    resolution: "1080p",
    duration: "12",
    videoStyle: "energetic",
    colorPalette: "neon",
    theme: "playful",
    backgroundMusic: "upbeat_pop",
    talkingStyle: "enthusiastic",
  },
  custom: {
    aspectRatio: "auto",
    resolution: "720p",
    duration: "auto",
    videoStyle: "cinematic",
    colorPalette: "default",
    theme: "modern_minimal",
    backgroundMusic: "none",
    talkingStyle: "none",
  },
};

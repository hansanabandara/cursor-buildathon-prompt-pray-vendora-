export const POSTER_LAYOUT_PRESETS = [
  "brand_hero",
  "sale_burst",
  "minimal_price_tag",
  "luxury_dark",
  "storefront_offer",
  "social_story",
  "ecommerce_banner",
  "custom",
] as const;
export type PosterLayoutPreset = (typeof POSTER_LAYOUT_PRESETS)[number];

export const POSTER_LAYOUT_LABELS: Record<PosterLayoutPreset, string> = {
  brand_hero:
    "Premium brand hero poster with large product spotlight, restrained headline typography and breathable negative space",
  sale_burst:
    "Bold retail sale flyer with explosive graphics, urgency cues and screaming discount typography",
  minimal_price_tag:
    "Ultra-minimal Scandinavian price-led layout — large price, slim supporting text, lots of whitespace",
  luxury_dark:
    "Luxury noir poster with charcoal background, champagne metallic accents and elegant serif typography",
  storefront_offer:
    "Outdoor storefront signage style — oversized readable headline readable from metres away",
  social_story:
    "Vertical Instagram / TikTok story layout with thumb-stopping typography at the bottom third",
  ecommerce_banner:
    "Wide ecommerce marketplace banner showcasing product strip, bullets and assurance icons",
  custom: "",
};

/**
 * fal poster-api expects literal enum tokens (NOT empty strings).
 * The workflow rejects "" with a 422 — use "auto" for "let the model decide".
 */
export const POSTER_ASPECT_RATIO_OPTIONS = [
  "auto",
  "21:9",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
] as const;
export type PosterAspectRatio = (typeof POSTER_ASPECT_RATIO_OPTIONS)[number];

export const POSTER_ASPECT_LABELS: Record<PosterAspectRatio, string> = {
  auto: "Auto (workflow default)",
  "21:9": "Ultrawide 21:9",
  "16:9": "Landscape 16:9",
  "4:3": "Landscape 4:3",
  "1:1": "Square 1:1",
  "3:4": "Portrait 3:4",
  "9:16": "Stories 9:16",
};

/**
 * fal poster-api uses qualitative `1K` / `2K` / `4K` tokens — sending a numeric
 * pixel string (e.g. "1024") returns a 422 with `Input should be '1K', '2K' or '4K'`.
 */
export const POSTER_RESOLUTION_OPTIONS = ["1K", "2K", "4K"] as const;
export type PosterResolution = (typeof POSTER_RESOLUTION_OPTIONS)[number];

export const POSTER_RESOLUTION_LABELS: Record<PosterResolution, string> = {
  "1K": "1K — fastest, social-ready",
  "2K": "2K — balanced",
  "4K": "4K — print quality",
};

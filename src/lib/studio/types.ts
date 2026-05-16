export const STYLE_OPTIONS = [
  "animated",
  "3d",
  "realistic",
  "high_res",
  "custom",
] as const;
export type Style = (typeof STYLE_OPTIONS)[number];

export const BACKGROUND_OPTIONS = [
  "transparent",
  "white",
  "cartoonish",
  "studio",
  "custom",
] as const;
export type Background = (typeof BACKGROUND_OPTIONS)[number];

export const LIGHTING_OPTIONS = [
  "left",
  "cinematic",
  "all_around",
  "dark",
  "custom",
] as const;
export type Lighting = (typeof LIGHTING_OPTIONS)[number];

export const STYLE_LABELS: Record<Style, string> = {
  animated: "Animated product image",
  "3d": "3D-looking product image",
  realistic: "Realistic product image",
  high_res: "Use image as-is, high resolution",
  custom: "Custom",
};

export const BACKGROUND_LABELS: Record<Background, string> = {
  transparent: "Transparent",
  white: "White",
  cartoonish: "Cartoonish",
  studio: "Realistic, studio-like",
  custom: "Custom",
};

export const LIGHTING_LABELS: Record<Lighting, string> = {
  left: "Left",
  cinematic: "Cinematic",
  all_around: "All around",
  dark: "Dark",
  custom: "Custom",
};

export const CAMERA_ANGLE_OPTIONS = [
  "front",
  "three_quarter",
  "side",
  "top_down",
  "low_angle",
  "high_angle",
  "isometric",
  "macro",
  "custom",
] as const;
export type CameraAngle = (typeof CAMERA_ANGLE_OPTIONS)[number];

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  front: "Front-on",
  three_quarter: "Three-quarter",
  side: "Side / profile",
  top_down: "Top-down (flat lay)",
  low_angle: "Low angle (hero shot)",
  high_angle: "High angle",
  isometric: "Isometric",
  macro: "Macro close-up",
  custom: "Custom",
};

// ---- Extra fal.ai workflow inputs ----------------------------------------

export const ASPECT_RATIO_OPTIONS = [
  "",
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "21:9",
] as const;
export type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number];

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "": "Default (workflow decides)",
  "1:1": "Square (1:1)",
  "16:9": "Landscape (16:9)",
  "9:16": "Portrait (9:16)",
  "4:3": "Classic (4:3)",
  "3:4": "Tall (3:4)",
  "21:9": "Ultrawide (21:9)",
};

export const RESOLUTION_OPTIONS = [
  "",
  "512",
  "768",
  "1024",
  "1536",
  "2048",
] as const;
export type Resolution = (typeof RESOLUTION_OPTIONS)[number];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  "": "Default (workflow decides)",
  "512": "512 px",
  "768": "768 px",
  "1024": "1024 px",
  "1536": "1536 px",
  "2048": "2048 px (max)",
};

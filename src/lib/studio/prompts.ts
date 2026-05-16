import type {
  AspectRatio,
  Background,
  CameraAngle,
  Lighting,
  Resolution,
  Style,
} from "./types";

const STYLE_PROMPTS: Record<Exclude<Style, "custom">, string> = {
  animated:
    "Reimagine the product as a vibrant animated illustration with clean linework, smooth gradients and playful, brand-friendly stylisation.",
  "3d":
    "Render the product as a polished 3D model with physically based materials, soft global illumination and subtle reflections that emphasise volume and depth.",
  realistic:
    "Produce a photo-realistic studio shot of the product with crisp detail, accurate materials and natural texture preservation.",
  high_res:
    "Keep the product exactly as shown but dramatically increase resolution and sharpness, removing noise and compression artefacts while preserving every original detail.",
};

const BACKGROUND_PROMPTS: Record<Exclude<Background, "custom">, string> = {
  transparent:
    "Place the product on a fully transparent background, perfectly isolated with a clean alpha cutout suitable for e-commerce overlays.",
  white:
    "Set the product against a pure, evenly lit white seamless background with a soft contact shadow underneath.",
  cartoonish:
    "Surround the product with a playful cartoon-style background using bold flat colours, simple shapes and a lighthearted vibe.",
  studio:
    "Stage the product in a realistic premium photography studio with subtle gradient backdrop, soft reflections on the floor and a tasteful professional finish.",
};

const CAMERA_ANGLE_PROMPTS: Record<Exclude<CameraAngle, "custom">, string> = {
  front:
    "Shoot the product dead-on from the front at eye level so the face of the product is fully visible and symmetrical.",
  three_quarter:
    "Shoot the product from a three-quarter angle (roughly 45 degrees) so both the front and one side are visible, giving a natural sense of depth.",
  side:
    "Shoot the product strictly from the side in a clean profile view, emphasising silhouette and proportions.",
  top_down:
    "Shoot the product from directly overhead in a flat-lay top-down composition, perfectly perpendicular to the surface.",
  low_angle:
    "Shoot from a low angle looking slightly up at the product, making it feel heroic and imposing.",
  high_angle:
    "Shoot from a high angle looking down at the product, giving a slightly elevated, premium editorial feel.",
  isometric:
    "Render in a clean isometric projection so all three principal sides of the product are visible at equal angles.",
  macro:
    "Use a tight macro close-up that emphasises fine surface detail, texture and material quality.",
};

const LIGHTING_PROMPTS: Record<Exclude<Lighting, "custom">, string> = {
  left:
    "Light the product strongly from the left with a single key light, casting gentle directional shadows that fall to the right.",
  cinematic:
    "Apply dramatic cinematic lighting with a strong key, contrasting rim light and moody falloff that gives the product editorial polish.",
  all_around:
    "Bathe the product in even, soft all-around lighting that eliminates harsh shadows and shows every surface clearly.",
  dark:
    "Use a low-key dark lighting scheme with a tight pool of warm light on the product and deep shadows around it for a luxurious, mysterious mood.",
};

export type PromptInputs = {
  productName: string;
  style: Style;
  background: Background;
  lighting: Lighting;
  cameraAngle: CameraAngle;
  customStyle?: string | null;
  customBackground?: string | null;
  customLighting?: string | null;
  customCameraAngle?: string | null;
  removeOtherText?: boolean;
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
};

const ASPECT_RATIO_DESCRIPTIONS: Record<
  Exclude<AspectRatio, "">,
  string
> = {
  "1:1": "perfectly square 1:1 composition",
  "16:9": "wide 16:9 landscape composition",
  "9:16": "tall 9:16 vertical / portrait composition",
  "4:3": "classic 4:3 landscape composition",
  "3:4": "3:4 vertical composition",
  "21:9": "ultrawide 21:9 cinematic composition",
};

export function composePrompt(input: PromptInputs): string {
  const styleText =
    input.style === "custom"
      ? (input.customStyle?.trim() ?? "")
      : STYLE_PROMPTS[input.style];

  const backgroundText =
    input.background === "custom"
      ? (input.customBackground?.trim() ?? "")
      : BACKGROUND_PROMPTS[input.background];

  const lightingText =
    input.lighting === "custom"
      ? (input.customLighting?.trim() ?? "")
      : LIGHTING_PROMPTS[input.lighting];

  const cameraText =
    input.cameraAngle === "custom"
      ? (input.customCameraAngle?.trim() ?? "")
      : CAMERA_ANGLE_PROMPTS[input.cameraAngle];

  const textCleanupInstruction = input.removeOtherText
    ? `Keep the product name "${input.productName}" exactly as it appears on the product (preserve its lettering, typography and placement), ` +
      "but remove every other piece of text, watermark, sticker, price tag, " +
      "barcode, packaging copy, slogan or extraneous lettering visible " +
      "anywhere in the image so that the product name is the only readable text in the final result."
    : null;

  // Aspect ratio fallback: many image-to-image models preserve the source
  // image's shape and ignore the `aspect_ratio` parameter unless it's also
  // mentioned in the prompt. Spell it out explicitly.
  const aspectText = input.aspectRatio
    ? `Output the final image as a ${ASPECT_RATIO_DESCRIPTIONS[input.aspectRatio as Exclude<typeof input.aspectRatio, "">]} ` +
      `(strict ${input.aspectRatio} aspect ratio), re-framing or extending the scene as needed so the product is properly composed inside that frame instead of inheriting the source image's shape.`
    : null;

  const resolutionText = input.resolution
    ? `Render at approximately ${input.resolution} pixels on the long edge with sharp, marketing-grade detail.`
    : null;

  const parts = [
    `Studio-grade e-commerce product image of "${input.productName}".`,
    styleText,
    backgroundText,
    cameraText,
    lightingText,
    aspectText,
    resolutionText,
    textCleanupInstruction,
    "Maintain product accuracy: do not alter logos, colours, labels or proportions beyond what is explicitly requested. Output should be marketing-ready with a clean, professional finish.",
  ].filter((p): p is string => Boolean(p) && p!.length > 0);

  return parts.join(" ");
}

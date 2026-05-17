/**
 * Recursive URL collectors for heterogeneous fal.ai workflow payloads.
 */

const FAL_CDN = /fal\.media/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
const GLB_EXT = /\.glb(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function collectImageUrls(value: unknown, out: string[] = []): string[] {
  if (!value) return out;
  if (typeof value === "string") {
    if (!isHttpUrl(value)) return out;
    if (IMAGE_EXT.test(value)) {
      out.push(value);
    } else if (FAL_CDN.test(value) && !GLB_EXT.test(value) && !VIDEO_EXT.test(value)) {
      // fal CDN assets often omit extensions in the path
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectImageUrls(v, out);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const contentType =
      typeof obj.content_type === "string" ? obj.content_type.toLowerCase() : "";
    if (contentType.startsWith("image/")) {
      for (const key of ["url", "image_url"]) {
        const v = obj[key];
        if (typeof v === "string" && isHttpUrl(v)) out.push(v);
      }
    }
    for (const key of ["image_url", "url"]) {
      const v = obj[key];
      if (typeof v === "string" && isHttpUrl(v)) {
        if (IMAGE_EXT.test(v) || (FAL_CDN.test(v) && !GLB_EXT.test(v) && !VIDEO_EXT.test(v))) {
          out.push(v);
        }
      }
    }
    for (const v of Object.values(obj)) collectImageUrls(v, out);
  }
  return out;
}

export function collectGlbUrls(value: unknown, out: string[] = []): string[] {
  if (!value) return out;
  if (typeof value === "string") {
    if (!isHttpUrl(value)) return out;
    if (GLB_EXT.test(value)) {
      out.push(value);
    } else if (
      FAL_CDN.test(value) &&
      !IMAGE_EXT.test(value) &&
      !VIDEO_EXT.test(value)
    ) {
      // Dress-3D and similar workflows often return extensionless fal CDN URLs
      out.push(value);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectGlbUrls(v, out);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const contentType =
      typeof obj.content_type === "string" ? obj.content_type.toLowerCase() : "";
    const fileName =
      typeof obj.file_name === "string" ? obj.file_name.toLowerCase() : "";

    if (
      contentType.includes("gltf") ||
      contentType.includes("model") ||
      fileName.endsWith(".glb")
    ) {
      for (const key of ["url", "model_url", "glb_url"]) {
        const v = obj[key];
        if (typeof v === "string" && isHttpUrl(v)) out.push(v);
      }
    }

    for (const key of ["model_url", "glb_url", "url", "file_url"]) {
      const v = obj[key];
      if (typeof v !== "string" || !isHttpUrl(v)) continue;
      if (GLB_EXT.test(v)) {
        out.push(v);
      } else if (
        FAL_CDN.test(v) &&
        !IMAGE_EXT.test(v) &&
        !VIDEO_EXT.test(v) &&
        (contentType.includes("gltf") ||
          contentType.includes("model") ||
          fileName.endsWith(".glb") ||
          key === "model_url" ||
          key === "glb_url")
      ) {
        out.push(v);
      }
    }
    for (const v of Object.values(obj)) collectGlbUrls(v, out);
  }
  return out;
}

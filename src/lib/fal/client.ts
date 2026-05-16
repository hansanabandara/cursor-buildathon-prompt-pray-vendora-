import { fal } from "@fal-ai/client";

let configured = false;

export function getFal() {
  if (!configured) {
    const key = process.env.FAL_KEY;
    if (!key) {
      throw new Error(
        "FAL_KEY is not set. Add it to .env.local to enable image generation."
      );
    }
    fal.config({ credentials: key });
    configured = true;
  }
  return fal;
}

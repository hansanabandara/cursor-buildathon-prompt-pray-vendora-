import {
  type PosterLayoutPreset,
  POSTER_LAYOUT_LABELS,
} from "./posterTypes";

export type PosterBriefInput = {
  layoutPreset: PosterLayoutPreset;

  headline?: string | null | undefined;
  subheadline?: string | null | undefined;

  /** e.g. 19.99 — shown as promotional price */
  price?: string | null | undefined;
  /** e.g. 29.99 — optional “was” compare */
  compareAtPrice?: string | null | undefined;
  currency?: string | null | undefined;

  phone?: string | null | undefined;
  whatsapp?: string | null | undefined;
  email?: string | null | undefined;
  website?: string | null | undefined;

  promoCode?: string | null | undefined;
  validUntil?: string | null | undefined;
  address?: string | null | undefined;

  ctaText?: string | null | undefined;

  /** Free-form styling / typography direction */
  extraNotes?: string | null | undefined;
};

/**
 * Compose a single natural-language brief for workflows/hansanabadara/poster-api.
 */
export function composePosterBrief(input: PosterBriefInput): string {
  const presetIntro =
    input.layoutPreset === "custom"
      ? "Custom poster: follow ONLY the marketer's paragraph below — no templated presets."
      : POSTER_LAYOUT_LABELS[input.layoutPreset];

  const presetLine = `${presetIntro}.`;

  const chunks: Array<string | null | undefined> = [
    presetLine,
    "Design a polished marketing poster that uses the provided product imagery as the hero. Keep typography legible at a glance.",

    input.headline?.trim()
      ? `Headline text (verbatim): "${input.headline.trim()}".`
      : null,

    input.subheadline?.trim()
      ? `Subheadline or tagline (verbatim): "${input.subheadline.trim()}".`
      : null,

    input.price?.trim()
      ? `Featured price display: "${input.currency?.trim() || ""}${input.price.trim()}".`
      : null,

    input.compareAtPrice?.trim()
      ? `Optional compare-at / “was” price: "${input.currency?.trim() || ""}${input.compareAtPrice.trim()}". Place it subtly as a strikethrough or muted label beside the hero price — do not invent other numbers.`
      : null,

    input.promoCode?.trim()
      ? `Promo or coupon code badge (verbatim): "${input.promoCode.trim()}".`
      : null,

    input.validUntil?.trim()
      ? `Offer validity note (verbatim): "${input.validUntil.trim()}".`
      : null,

    input.phone?.trim()
      ? `Contact phone block (verbatim): "${input.phone.trim()}".`
      : null,

    input.whatsapp?.trim()
      ? `WhatsApp line (verbatim): "${input.whatsapp.trim()}".`
      : null,

    input.email?.trim()
      ? `Email contact (verbatim): "${input.email.trim()}".`
      : null,

    input.website?.trim()
      ? `Website / URL strip (verbatim): "${input.website.trim()}".`
      : null,

    input.address?.trim()
      ? `Store location or footer address (verbatim): "${input.address.trim()}".`
      : null,

    input.ctaText?.trim()
      ? `Call-to-action phrase on the button/badge (verbatim): "${input.ctaText.trim()}".`
      : null,

    input.extraNotes?.trim()
      ? `Additional art direction from the marketer: ${input.extraNotes.trim()}`
      : null,

    // Guardrails
    "Do not invent unrelated products or fake QR codes.",
    'Use exactly the verbatim strings provided above for textual elements — typography may be styled but wording must remain identical.',
    "Leave comfortable margins safe for cropping on social platforms.",
  ];

  return chunks
    .filter((c): c is string => Boolean(c && c.trim().length > 0))
    .join("\n\n");
}

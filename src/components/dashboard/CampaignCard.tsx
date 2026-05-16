"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { motion } from "motion/react";

import type { Campaign } from "@/lib/actions/campaigns";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CampaignCardMenu } from "@/components/dashboard/CampaignCardMenu";

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const createdAt = new Date(campaign.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <motion.div
      variants={cardVariants}
      className="group relative overflow-hidden rounded-xl glass-card text-card-foreground transition-all hover:border-white/14 hover:shadow-lg hover:shadow-violet-500/5"
    >
      <Link href={`/studio/${campaign.id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-white/3">
          {campaign.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.thumbnail_url}
              alt={campaign.product_name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        <div className="space-y-1 p-4">
          <h3 className="truncate text-base font-semibold leading-tight">
            {campaign.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {campaign.product_name}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">
            Created {createdAt}
          </p>
        </div>
      </Link>

      <CampaignCardMenu campaign={campaign} />
    </motion.div>
  );
}

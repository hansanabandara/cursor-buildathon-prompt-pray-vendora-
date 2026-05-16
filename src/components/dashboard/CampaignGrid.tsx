"use client";

import { motion } from "motion/react";

import type { Campaign } from "@/lib/actions/campaigns";
import { CampaignCard } from "@/components/dashboard/CampaignCard";

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </motion.div>
  );
}

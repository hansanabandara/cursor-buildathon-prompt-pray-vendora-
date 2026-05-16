"use server";

import { createClient } from "@/lib/supabase/server";

export type CampaignStatus =
  | "draft"
  | "processing"
  | "completed"
  | "failed";

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  product_name: string;
  status: CampaignStatus;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, user_id, name, product_name, status, thumbnail_url, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch campaigns:", error.message);
    return [];
  }

  return (data ?? []) as Campaign[];
}

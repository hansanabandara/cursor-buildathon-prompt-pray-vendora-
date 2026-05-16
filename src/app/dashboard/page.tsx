import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCampaigns } from "@/lib/actions/campaigns";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const metadata = {
  title: "Dashboard · Vendora",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already protects this route,
  // but redirect here as well for safety.
  if (!user) {
    redirect("/login");
  }

  const campaigns = await getCampaigns();

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader email={user.email ?? ""} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Campaigns
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse and manage your AI-generated marketing campaigns.
            </p>
          </div>

          {campaigns.length > 0 ? (
            <Link
              href="/studio"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New campaign
            </Link>
          ) : null}
        </div>

        {campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <CampaignGrid campaigns={campaigns} />
        )}
      </main>
    </div>
  );
}

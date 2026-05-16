import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export const metadata = {
  title: "Studio · Vendora",
};

export default function StudioNewPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gradient">
          New campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload your product image, choose a style, and Vendora will refine it
          into a studio-grade marketing visual — or skip straight to media
          creation.
        </p>
      </div>

      <StudioWorkspace />
    </div>
  );
}

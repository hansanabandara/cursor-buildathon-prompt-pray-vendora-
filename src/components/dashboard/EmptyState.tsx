import Link from "next/link";
import { Sparkles } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Sparkles className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-lg font-semibold">No campaigns yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Step into the production environment through the Studio creation flow
        to generate your first omnichannel marketing campaign.
      </p>
      <Link
        href="/studio"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        Open Studio
      </Link>
    </div>
  );
}

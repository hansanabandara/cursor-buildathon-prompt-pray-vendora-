import Link from "next/link";
import { Sparkles, LogOut } from "lucide-react";

import { signOut } from "@/lib/actions/auth";

export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" />
          Vendora
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

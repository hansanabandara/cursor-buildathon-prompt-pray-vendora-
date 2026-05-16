import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/actions/auth";

export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
          <Image
            src="/vendora-logo.png"
            alt="Vendora"
            width={28}
            height={28}
            priority
            className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          />
          <span className="text-gradient">Vendora</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground"
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

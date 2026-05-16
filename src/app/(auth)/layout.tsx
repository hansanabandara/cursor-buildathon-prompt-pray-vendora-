import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-6 w-6" />
          Vendora
        </Link>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            AI-powered marketing media,
            <br />
            built in minutes.
          </h1>
          <p className="text-sm text-primary-foreground/80">
            Generate omnichannel campaigns and e-commerce listings with a single
            studio workflow powered by fal.ai.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel — dark canvas so the violet logo reads clearly */}
      <div className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center">
        {/* Background: deep navy + radial accents */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(139,92,246,0.25) 0%, transparent 60%), " +
              "radial-gradient(ellipse 60% 50% at 90% 80%, rgba(56,189,248,0.15) 0%, transparent 60%), " +
              "linear-gradient(180deg, #07060f 0%, #0a0814 100%)",
          }}
        />

        {/* Subtle noise/grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 30% 50%, black 0%, transparent 70%)",
          }}
        />

        {/* Centered logo + wordmark */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-10 text-center">
          <div className="relative animate-float">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(139,92,246,0.55) 0%, transparent 70%)",
              }}
            />
            <Image
              src="/vendora-logo.png"
              alt="Vendora logo"
              width={220}
              height={220}
              priority
              className="drop-shadow-[0_0_30px_rgba(139,92,246,0.45)]"
            />
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight text-gradient">
            Vendora
          </h1>

          <p className="max-w-sm text-sm text-white/60">
            AI-powered omnichannel marketing media, built in minutes.
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

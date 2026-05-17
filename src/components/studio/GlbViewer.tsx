"use client";

import Script from "next/script";
import { type CSSProperties, useState } from "react";

export function GlbViewer({ url }: { url: string }) {
  const [ready, setReady] = useState(false);

  const style: CSSProperties = {
    width: "100%",
    height: "min(440px,70vh)",
    backgroundColor: "#0d0d12",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <Script
        type="module"
        src="https://unpkg.com/@google/model-viewer@4.1.0/dist/model-viewer.min.js"
        onLoad={() => setReady(true)}
      />
      {!ready ? (
        <div className="flex h-[min(440px,70vh)] items-center justify-center text-sm text-muted-foreground">
          Loading 3D viewer…
        </div>
      ) : (
        // @ts-expect-error — `<model-viewer>` is injected by Google's script bundle at runtime.
        <model-viewer
          key={url}
          src={url}
          alt="Generated 3D model"
          camera-controls=""
          auto-rotate=""
          touch-action="pan-y"
          style={style}
        />
      )}
    </div>
  );
}

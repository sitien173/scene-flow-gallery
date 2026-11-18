"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_FILTERS } from "@/components/theme-filter";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/lib/videos";

type VideoPlayerProps = {
  videoUrl: string;
  posterUrl: string;
};

// THEME_FILTERS lives in a client module, so the label is looked up here, not in the server page.
export function ThemeBadge({ theme }: { theme: Video["theme"] }) {
  const label = THEME_FILTERS.find((filter) => filter.value === theme)?.label;
  return <Badge variant="outline">{label}</Badge>;
}

export function VideoPlayer({ videoUrl, posterUrl }: VideoPlayerProps) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // The server-rendered video can fail before hydration attaches onError, so check once after mount.
  useEffect(() => {
    if (videoRef.current?.error) setFailed(true);
  }, []);

  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
      {failed ? (
        <p
          role="status"
          className="flex size-full items-center justify-center text-sm text-muted-foreground"
        >
          Video unavailable
        </p>
      ) : (
        // biome-ignore lint/a11y/useMediaCaption: the transcript is shown on the page below the player
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          src={videoUrl}
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      )}
    </div>
  );
}

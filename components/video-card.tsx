"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { THEME_FILTERS } from "@/components/theme-filter";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/lib/videos";

function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VideoCard({ video }: { video: Video }) {
  const [posterFailed, setPosterFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [previewAllowed, setPreviewAllowed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showPreview = (hovered || focused) && previewAllowed;
  const themeLabel = THEME_FILTERS.find(
    (filter) => filter.value === video.theme,
  )?.label;

  useEffect(() => {
    const noHover = window.matchMedia("(hover: none)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      setPreviewAllowed(!noHover.matches && !reducedMotion.matches);
    sync();
    noHover.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      noHover.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (showPreview) videoRef.current?.play().catch(() => undefined);
  }, [showPreview]);

  return (
    <Link
      href={`/v/${video.slug}/`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        {posterFailed ? null : (
          // biome-ignore lint/performance/noImgElement: native lazy img is required; static export uses unoptimized images
          <img
            src={video.posterUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPosterFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {showPreview ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
      </div>
      <h2 lang={video.lang} className="mt-3 text-sm leading-snug font-medium">
        {video.title}
      </h2>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{themeLabel}</Badge>
        <span className="tabular-nums">
          {formatDuration(video.durationSec)}
        </span>
      </div>
    </Link>
  );
}

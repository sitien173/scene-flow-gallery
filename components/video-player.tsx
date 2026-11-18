"use client";

import { useEffect, useRef, useState } from "react";

type VideoPlayerProps = {
  videoUrl: string;
  posterUrl: string;
};

export function VideoPlayer({ videoUrl, posterUrl }: VideoPlayerProps) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // The server-rendered video can fail before hydration attaches onError, so check once after mount.
  useEffect(() => {
    if (videoRef.current?.error) setFailed(true);
  }, []);

  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-xl bg-black">
      {failed ? (
        <p
          role="status"
          className="flex size-full items-center justify-center text-sm text-muted-foreground"
        >
          Không phát được video
        </p>
      ) : (
        // biome-ignore lint/a11y/useMediaCaption: the transcript is shown on the page
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

import { Suspense } from "react";
import { VideoGrid, VideoGridFallback } from "@/components/video-grid";
import { getVideos } from "@/lib/videos";

export default function Home() {
  const videos = getVideos();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-8">
      <h1 className="text-3xl font-semibold">Scene Flow Gallery</h1>
      {videos.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No videos yet.</p>
      ) : (
        <Suspense fallback={<VideoGridFallback videos={videos} />}>
          <VideoGrid videos={videos} />
        </Suspense>
      )}
    </main>
  );
}

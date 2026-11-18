import { VideoGrid } from "@/components/video-grid";
import { getVideos } from "@/lib/videos";

export default function Home() {
  const videos = getVideos().toSorted((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">
      <h1>
        {/* biome-ignore lint/performance/noImgElement: native img is required; static export uses unoptimized images */}
        <img
          src="/brand/c1-lockup-white.webp"
          width={899}
          height={200}
          alt="Góc Nhìn Mở"
          className="h-8 w-auto sm:h-12"
        />
      </h1>
      {videos.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Chưa có video nào.</p>
      ) : (
        <VideoGrid videos={videos} />
      )}
    </main>
  );
}

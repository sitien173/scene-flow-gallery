import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/videos";

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <li key={video.slug}>
          <VideoCard video={video} />
        </li>
      ))}
    </ul>
  );
}

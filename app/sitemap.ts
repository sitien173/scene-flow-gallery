import type { MetadataRoute } from "next";
import { getVideos } from "@/lib/videos";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gallery.example.com";

  return [
    { url: new URL("/", site).toString() },
    ...getVideos().map((video) => ({
      url: new URL(`/v/${video.slug}/`, site).toString(),
      lastModified: video.publishedAt,
    })),
  ];
}

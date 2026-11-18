import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { getVideo, getVideos, type Video } from "@/lib/videos";

export const dynamicParams = false;

const VOICE_LABELS: Record<Video["sources"]["voice"], string> = {
  "self-recorded": "Tự thu âm",
  "tts-api": "TTS API",
  "vieneu-tts": "VieNeu-TTS",
};

function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function httpUrl(value: string | undefined) {
  const url = value ? URL.parse(value) : null;
  return url?.protocol === "http:" || url?.protocol === "https:"
    ? value
    : undefined;
}

function descriptionOf(video: Video) {
  return video.script.replace(/\s+/g, " ").trim().slice(0, 160);
}

function isoDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  return `PT${Math.floor(seconds / 60)}M${seconds % 60}S`;
}

// Escapes "<" so manifest text cannot close the JSON-LD script element.
function jsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Static export needs at least one generated route. An empty manifest yields
// a slug the manifest regex rejects, so that route renders notFound().
export function generateStaticParams() {
  const videos = getVideos();
  return videos.length > 0
    ? videos.map((video) => ({ slug: video.slug }))
    : [{ slug: "_none" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/v/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const video = getVideo(slug);
  if (!video) notFound();

  const description = descriptionOf(video);
  return {
    title: video.title,
    description,
    alternates: { canonical: `/v/${video.slug}/` },
    openGraph: {
      type: "video.other",
      title: video.title,
      description,
      images: [video.posterUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
      images: [video.posterUrl],
    },
  };
}

export default async function VideoPage({ params }: PageProps<"/v/[slug]">) {
  const { slug } = await params;
  const video = getVideo(slug);
  if (!video) notFound();

  const published = new Date(video.publishedAt).toLocaleDateString("vi-VN", {
    dateStyle: "long",
    timeZone: "UTC",
  });
  const creatorUrl = httpUrl(video.creator.url);
  const description = descriptionOf(video);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-8">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized with "<" escaped, and the manifest is validated
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.title,
            description,
            thumbnailUrl: video.posterUrl,
            uploadDate: video.publishedAt,
            duration: isoDuration(video.durationSec),
            contentUrl: video.videoUrl,
            inLanguage: video.lang,
            creator: {
              "@type": "Person",
              name: video.creator.name,
              ...(creatorUrl ? { url: creatorUrl } : {}),
            },
          }),
        }}
      />
      <div className="md:grid md:grid-cols-[auto_1fr] md:items-start md:gap-8">
        <div className="md:w-[calc((100svh-8rem)*9/16)]">
          <VideoPlayer videoUrl={video.videoUrl} posterUrl={video.posterUrl} />
        </div>
        <div className="mt-6 md:mt-0">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Tất cả video
          </Link>
          <h1 lang={video.lang} className="mt-4 text-3xl font-semibold">
            {video.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            <time dateTime={video.publishedAt}>{published}</time>
            {" · "}
            <span className="tabular-nums">
              {formatDuration(video.durationSec)}
            </span>
          </p>
          <section aria-labelledby="transcript-heading" className="mt-8">
            <h2 id="transcript-heading" className="text-lg font-semibold">
              Lời thoại
            </h2>
            <p lang={video.lang} className="mt-2 whitespace-pre-line">
              {video.script}
            </p>
          </section>
          <div className="mt-8 space-y-1 text-sm text-muted-foreground">
            <p>
              Người tạo:{" "}
              {creatorUrl ? (
                <a
                  href={creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {video.creator.name}
                </a>
              ) : (
                video.creator.name
              )}
            </p>
            <p>Giọng đọc: {VOICE_LABELS[video.sources.voice]}</p>
            <p>
              Quay màn hình: {video.sources.screenRecordings ? "có" : "không"}
            </p>
            {video.sources.notes ? <p>Ghi chú: {video.sources.notes}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const DEFAULT_MEDIA_HOST = "media.example.com";
const DEFAULT_MANIFEST = "content/videos.json";

function mediaHost() {
  return process.env.NEXT_PUBLIC_MEDIA_HOST || DEFAULT_MEDIA_HOST;
}

// RFC 5646 section 2.1: langtag, privateuse, and grandfathered tags, case-insensitive.
const BCP47_TAG =
  /^(?:(?:[a-z]{2,3}(?:-[a-z]{3}){0,3}|[a-z]{4}|[a-z]{5,8})(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?(?:-(?:[a-z\d]{5,8}|\d[a-z\d]{3}))*(?:-[a-wy-z\d](?:-[a-z\d]{2,8})+)*(?:-x(?:-[a-z\d]{1,8})+)?|x(?:-[a-z\d]{1,8})+|en-gb-oed|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)|sgn-(?:be-fr|be-nl|ch-de)|art-lojban|cel-gaulish|no-(?:bok|nyn)|zh-(?:guoyu|hakka|min|min-nan|xiang))$/i;

const mediaUrl = z
  .url()
  .refine((url) => URL.parse(url)?.hostname === mediaHost(), {
    message: "URL hostname must equal the media host",
  });

const nonBlankText = z
  .string()
  .min(1)
  .refine((text) => text.trim().length > 0, { message: "must not be blank" });

const videoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: nonBlankText,
  theme: z.enum(["dark", "paper", "world3d"]),
  videoUrl: mediaUrl,
  posterUrl: mediaUrl,
  durationSec: z.number().positive(),
  publishedAt: z.iso.date(),
  lang: z
    .string()
    .regex(BCP47_TAG, { message: "must be a valid BCP 47 language tag" }),
  script: nonBlankText,
  creator: z.object({
    name: z.string().min(1),
    url: z.url().optional(),
  }),
  sources: z.object({
    voice: z.enum(["self-recorded", "tts-api", "vieneu-tts"]),
    screenRecordings: z.boolean(),
    notes: z.string().optional(),
  }),
});

const manifestSchema = z.array(videoSchema).superRefine((videos, ctx) => {
  const slugs = new Set<string>();
  videos.forEach((video, index) => {
    if (slugs.has(video.slug)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "slug"],
        message: `duplicate slug "${video.slug}"`,
      });
    }
    slugs.add(video.slug);
  });
});

export type Video = z.infer<typeof videoSchema>;

export function parseVideos(raw: unknown): Video[] {
  const result = manifestSchema.safeParse(raw);
  if (!result.success) {
    const { path, message } = result.error.issues[0];
    const where = path
      .map((key) => (typeof key === "number" ? `[${key}]` : `.${String(key)}`))
      .join("");
    throw new Error(`videos${where}: ${message}`);
  }
  return result.data;
}

export function getVideos(): Video[] {
  const file = resolve(process.env.VIDEOS_MANIFEST || DEFAULT_MANIFEST);
  return parseVideos(JSON.parse(readFileSync(file, "utf8")));
}

export function getVideo(slug: string): Video | undefined {
  return getVideos().find((video) => video.slug === slug);
}

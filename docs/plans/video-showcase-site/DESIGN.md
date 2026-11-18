# Video Showcase Site Design

**Status:** Confirmed 2026-11-18
**Consultation:** consult job 2826bbd8 found plugin-install leakage, release-please coupling, and HEVC playback gaps; led to a separate repo, an H.264 re-encode script, and static detail routes.

## Purpose

A public gallery of finished videos made with the `scene-flow` plugin. Prospective users see example outputs before installing. The `scene-flow` README links to it.

## Users and Success Criteria

Users:

- Prospective `scene-flow` users browsing examples.
- The maintainer, who adds videos.

Success criteria:

- The grid shows every manifest video as a 9:16 card with a poster, title, and theme.
- The theme filter narrows the grid to `dark`, `paper`, or `world3d` and records the choice in `?theme=`.
- Each video has a shareable static page at `/v/[slug]` with a player, title, theme, creator credit, source notes, and script transcript.
- Videos play in current Chrome, Firefox, and Safari on desktop and mobile.
- Adding a video takes one script run, one upload, and one manifest entry.
- The build fails on any invalid manifest entry.

## Constraints, Invariants, and Non-Goals

Constraints:

- Separate repository at `~/projects/scene-flow-gallery`. Plugin installs copy the whole `scene-flow` repo through `.claude-plugin/marketplace.json` `"source": "./"`, so site code must stay out of it.
- Stack: Next.js 16 with Turbopack and `output: 'export'`, React 19, TypeScript, Tailwind CSS v4, shadcn/ui on Base UI, Zod 4, Biome, Vitest, Playwright, pnpm.
- Media on Cloudflare R2 behind a custom domain. The site is on Cloudflare Pages. No media in Git.
- Published encode: H.264 High, `yuv420p`, AAC, `+faststart`, 720x1280.
- No credentials in the repository. Upload uses `wrangler login` or `CLOUDFLARE_API_TOKEN` from the shell.

Invariants:

- `content/videos.json` is the single source of video data.
- Every `videoUrl` and `posterUrl` points at the configured media host.
- Slugs are unique and match `^[a-z0-9-]+$`.

Non-goals:

- Modal or intercepting routes, HLS, multiple renditions, separate preview clips.
- Search, tags, pagination, CMS, admin UI, uploads through the site.
- Zustand, TanStack Query, generated OG images, WebVTT caption files. Videos carry burned-in karaoke captions and the page shows the script as a transcript.
- Any change to the `scene-flow` repo except one README link after launch.

## Chosen Approach

Static Next.js 16 export driven by a Zod-validated JSON manifest, with media on R2 and deployment on Cloudflare Pages.

- Rejected: single static HTML page. It has no theme filter or per-video pages and scales poorly.
- Rejected: Next.js listing R2 directly. It needs credentials, a server, and running cost.
- Rejected: `site/` inside `scene-flow`. It ships in every plugin install and couples release-please.

## Architecture and Data Flow

Routes:

- `/`: grid of 9:16 cards with a theme toggle group using `aria-pressed`, a live result count, and filter state in `?theme=`.
- `/v/[slug]`: static page from `generateStaticParams` with `dynamicParams = false`.

Manifest `content/videos.json`, validated by a Zod schema at build time:

| Field | Type | Rule |
|---|---|---|
| `slug` | string | `^[a-z0-9-]+$`, unique |
| `title` | string | non-empty |
| `theme` | enum | `dark`, `paper`, `world3d` |
| `videoUrl` | URL | media host only |
| `posterUrl` | URL | media host only |
| `durationSec` | number | positive |
| `publishedAt` | date | ISO 8601 |
| `lang` | string | BCP 47 tag |
| `script` | string | non-empty |
| `creator` | object | `name` required, `url` optional |
| `sources` | object | `voice` is `self-recorded`, `tts-api`, or `vieneu-tts`; `screenRecordings` boolean; `notes` optional |

Media pipeline:

1. The maintainer renders a video with `scene-flow`.
2. `scripts/prepare-video.sh <input> <slug> <poster-time>` re-encodes to the published encode, extracts a 720x1280 WebP poster, reads the duration with `ffprobe`, and prints a manifest entry.
3. The maintainer uploads with `wrangler r2 object put <bucket>/v/<slug>-v1.mp4 --file <file> --content-type video/mp4 --cache-control "public, max-age=31536000, immutable" --remote`, and the same for the poster with `image/webp`.
4. The maintainer adds the entry, commits, and Cloudflare Pages builds and deploys `out/`.

Player behaviour:

- Grid cards render a lazy poster `<img>`. A muted `<video preload="none">` mounts only on hover or focus and unmounts on leave.
- No previews on touch devices or under `prefers-reduced-motion`. Tapping a card opens its page.
- The detail player uses native controls and never autoplays.
- Title and transcript carry the entry `lang`. Fonts include the `vietnamese` subset.

SEO:

- `metadataBase` from configuration.
- Per-video `og:image` from the poster and `VideoObject` JSON-LD.
- `sitemap.ts` and `robots.ts` generated at build time.

Configuration:

- `NEXT_PUBLIC_MEDIA_HOST` and `NEXT_PUBLIC_SITE_URL`, documented in a committed `.env.example`.
- Placeholders `media.example.com` and `gallery.example.com` until real domains exist.

## Errors and Edge Cases

- An invalid manifest, duplicate slug, or foreign host fails the build and reports the entry index and field.
- A media 404 at runtime keeps the card's title and theme visible. The detail page shows "Video unavailable" instead of a broken player.
- `prepare-video.sh` always re-encodes, so HEVC or MP3 inputs convert. It exits non-zero when the input is not 9:16 or the poster time exceeds the duration.
- A filter with no matches shows an empty state with a "Show all" control.
- An empty manifest renders the empty state and the build succeeds.

## Migration

n/a. This is a new repository. `scene-flow` gains one README link after the site is live.

## Testing

- Vitest: the schema accepts a valid entry and rejects a duplicate slug, an invalid slug, a foreign host, and a missing required field.
- Playwright smoke test against the built export: the grid renders, the filter narrows cards and updates `?theme=`, a card opens `/v/[slug]`, and the player and transcript are present.
- GitHub Actions on each pull request: `biome check`, `vitest run`, `next build`, Playwright.

## Risks and Open Questions

- The production media host and site domain are not chosen. Placeholders stay until the maintainer sets them.
- Cloudflare setup is manual and owned by the maintainer: create the R2 bucket, attach its custom domain, connect the Pages project to the GitHub repository.
- TTS terms for VieNeu-TTS or any TTS API may require attribution. Not verified. `sources.notes` can carry the attribution line.
- Cloudflare Pages trailing-slash behaviour must be checked against Next.js `trailingSlash` before launch.

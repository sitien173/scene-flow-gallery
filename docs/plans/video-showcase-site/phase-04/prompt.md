# Phase 4: Video pages and SEO metadata

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: Each video has a shareable, indexable static page at `/v/<slug>/` with a player, metadata, JSON-LD, a sitemap, and robots.txt.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-04/base`
- Prior State:
  - Phase 1: Next.js 16.4.6 static export (`output: "export"`, `trailingSlash: true`, `images.unoptimized`), React 19.3, Tailwind v4, shadcn base-nova on Base UI, Biome (`pnpm lint`), Vitest (`pnpm test`).
  - Phase 2: `lib/videos.ts` exports `Video`, `parseVideos`, `getVideos()`, `getVideo(slug)`. `content/videos.json` is `[]`. `tests/fixtures/videos.json` has `intro-dark` (dark, vi), `paper-overview` (paper, en), `tour-world3d` (world3d, vi). 29 Vitest tests pass.
  - Phase 3: `/` renders the grid. `components/video-card.tsx` links to `/v/<slug>/`. `components/ui/badge.tsx` exists. `THEME_FILTERS` in `components/theme-filter.tsx` maps theme values to labels. Page `<title>` and layout live in `app/layout.tsx`.
- PNPM NOTE: `/home/ngosi/pnpm-workspace.yaml` is a home-level file outside the repo. Pass `--ignore-workspace` to any `pnpm add` or `pnpm install`. Do not edit that file. Phase 4 should need no new dependency.
- Verify current APIs with `npx ctx7@latest` before coding: `npx ctx7@latest library Next.js "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`. At most 3 ctx7 commands per question. Cover: Next.js 16 `generateStaticParams` with `dynamicParams = false` and `output: "export"` (params is a Promise in Next 16: `await params`), `generateMetadata`, `metadataBase`, `app/sitemap.ts` and `app/robots.ts` under static export (`export const dynamic = "force-static"`), and what an empty `generateStaticParams()` result does in a static export build.

Page and metadata contract:

1. `app/v/[slug]/page.tsx` is a server component with `generateStaticParams` returning `getVideos().map(v => ({ slug: v.slug }))` and `export const dynamicParams = false`. `generateMetadata` and the page call `getVideo(slug)` and `notFound()` on `undefined`.
2. EMPTY MANIFEST EDGE CASE: `content/videos.json` ships as `[]`, so `pnpm build` runs with zero params. Verify with the real build whether Next 16 static export accepts an empty `generateStaticParams`. If it errors, handle it in the smallest way that keeps the build green and the fixture build correct, and record the decision in `notes.md`. Do not ship a placeholder video entry.
3. Page content: back link to `/` (text `All videos`); `<h1 lang={video.lang}>` title; theme badge using the label from `THEME_FILTERS`; duration `m:ss`; published date formatted from `publishedAt` inside a `<time dateTime={publishedAt}>`; creator credit, where the creator name links out only when `creator.url` parses with protocol `http:` or `https:`, with `target="_blank" rel="noopener noreferrer"`, and otherwise renders as plain text; source notes (voice source label, `Screen recordings: yes|no`, optional `notes`); the script as a transcript in a `<section>` with a heading `Transcript`, `lang={video.lang}`, `whitespace-pre-line`.
4. `components/video-player.tsx` is a client component: `<video controls playsInline preload="metadata" poster={posterUrl} src={videoUrl}>` with no autoplay, 9:16 box, sized responsively with a max width. On the video `error` event, replace the player with visible text `Video unavailable` in the same box (`role="status"`). The player must not render in a way that autoplays or loops.
5. Metadata: `app/layout.tsx` sets `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gallery.example.com")` and keeps existing metadata and font setup. `generateMetadata` returns title, description (first 160 characters of `script`, whitespace collapsed), `alternates.canonical` `/v/<slug>/`, `openGraph` with `type: "video.other"`, `images: [posterUrl]`, and `twitter.card` `summary_large_image` with the poster.
6. JSON-LD: a `VideoObject` in `<script type="application/ld+json">` with `name`, `description`, `thumbnailUrl` (posterUrl), `uploadDate` (publishedAt), `duration` as ISO 8601 (for example `PT1M30S`), `contentUrl` (videoUrl), `inLanguage` (lang), and `creator` (a `Person` with `name` and `url` only when the url is http or https). Serialize with `JSON.stringify(...).replace(/</g, "\\u003c")`. Put the serializer in the page file or a tiny local function; do not add a dependency.
7. `app/sitemap.ts` returns `/` and every `/v/<slug>/` as absolute URLs built from `NEXT_PUBLIC_SITE_URL` (same default as the layout), with `lastModified` from `publishedAt` for video pages. `app/robots.ts` allows all and sets `sitemap` to `<site>/sitemap.xml`. Both declare `export const dynamic = "force-static"`.
8. Debt owned by this phase, in `lib/videos.ts` and `lib/videos.test.ts`: `title` and `script` must reject whitespace-only strings (trim then require non-empty; keep the stored value as given). Add failing-then-passing Vitest cases for whitespace-only `title` and whitespace-only `script`, each rejecting with the entry index and field in the message. Do not change any other schema rule.

## Invariants & Boundaries
- Preserve Phase 1 to 3 behavior. `pnpm lint`, `pnpm test`, and `pnpm build` keep passing. `/` still contains the card links and no `<video`.
- Static export only. No modal or intercepting routes. No new dependency. No runtime data fetching.
- Out of Scope: Playwright, CI, the media script, docs, changes to the grid or card, `content/videos.json`, `tests/fixtures/`.
- Fixture and manifest text is untrusted for HTML purposes: never use `dangerouslySetInnerHTML` except for the JSON-LD script with the escape in item 6.
- Do not touch `docs/plans/` except your own phase records. Do not commit; the Coordinator owns Git.

## Files
Allowed production and test paths:
- `app/layout.tsx` (modify: add `metadataBase` only)
- `app/v/[slug]/page.tsx` (create)
- `components/video-player.tsx` (create)
- `app/sitemap.ts` (create)
- `app/robots.ts` (create)
- `lib/videos.ts` (modify: whitespace-only rejection for `title` and `script` only)
- `lib/videos.test.ts` (modify: add the whitespace cases)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-04/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-04/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, `content/`, `tests/fixtures/`, `components/video-card.tsx`, `components/video-grid.tsx`, or secrets.

## Tasks
- task-1: Whitespace-only debt. RED: add the two Vitest cases and show them failing by assertion. GREEN: fix `lib/videos.ts`.
- task-2: Build the static route and `components/video-player.tsx` with the unavailable fallback and the page content from item 3. RED: with the fixture manifest, `out/v/intro-dark/index.html` does not exist before the route; GREEN: it exists and contains the transcript text.
- task-3: Add `metadataBase`, `generateMetadata`, JSON-LD, sitemap, and robots. Resolve the empty-manifest edge case from item 2.
- Evidence: after each task run `pnpm lint` and `pnpm build` and record commands and results in `notes.md`. For task-2 and task-3 also record the grep checks. Also check by scratch script outside the repo, or by Vitest only if you add no file outside the allowed list, that the JSON-LD serializer escapes `<` for a title such as `</script><b>x`: render a temporary copy of the fixture to `/tmp` and build with `VIDEOS_MANIFEST` pointing at it, then confirm `out/v/<slug>/index.html` has no raw `</script><b>` inside the JSON-LD block. Delete the temporary files afterwards.

## Done When
- All Vitest cases pass, including the new whitespace cases.
- With the fixture manifest: `out/v/<slug>/index.html` exists for each of the three slugs and contains `og:image`, `application/ld+json`, and that entry's script text; `out/sitemap.xml` lists `/` and the three video pages with absolute URLs; `out/robots.txt` references the sitemap; no `<video autoplay` anywhere; `out/index.html` is unchanged in card links.
- External creator links carry `rel="noopener noreferrer"`; a non-http creator URL renders as plain text.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (Baseline: exit 0)
  - `pnpm test` (Baseline: exit 0, 29 tests)
  - `pnpm build` (Baseline: exit 0)
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(ls -d out/v/*/ | wc -l)" -eq 3 && grep -q 'application/ld+json' out/v/*/index.html && grep -q '/v/' out/sitemap.xml && grep -qi sitemap out/robots.txt` (Baseline: no `out/v`)
- After the last check, run `pnpm build` once more so `out/` reflects the empty manifest.

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-04/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-04/journal.md`, then return that block and the matching status line from `erp.md`.

<!-- refract-shared-version: 3.0.8 -->

# Phase 4 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Added `nonBlankText` in `lib/videos.ts` (`z.string().min(1).refine(trim non-empty)`). `title` and `script` use it. The stored value is not trimmed. `min(1)` stays so the empty-string rule is unchanged.
- The whitespace rule uses the message `must not be blank`. Zod prefixes it with `videos[<index>].<field>: `.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- none

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test` (after adding two cases in `lib/videos.test.ts`, before the schema change) -> exit non-zero (`ELIFECYCLE`); `2 failed | 29 passed (31)`; `AssertionError: expected [Function] to throw an error` for `rejects a whitespace-only title ...` (`videos[2].title`) and `rejects a whitespace-only script ...` (`videos[1].script`).
  - GREEN: `pnpm test` -> exit 0; `31 passed (31)`.
  - Lint: `pnpm lint` -> exit 0; `Checked 23 files in 10ms. No fixes applied.`
  - Build: `pnpm build` -> exit 0; routes `/` and `/_not-found` prerendered.
- Root cause (bugfix only): none

## Task 2

### Decisions made
- Route at `app/v/[slug]/page.tsx`. It is a server component with `export const dynamicParams = false`, `generateStaticParams` from `getVideos()`, and `await params` (Next 16 `PageProps<"/v/[slug]">`). A missing slug calls `notFound()`.
- `components/video-player.tsx` exports two components. `VideoPlayer` is the client `<video controls playsInline preload="metadata" poster src>` with no autoplay or loop. On `error` it replaces the player with `<p role="status">Video unavailable</p>` inside the same 9:16 box.
- `ThemeBadge` is also exported from `components/video-player.tsx`. Reason: `THEME_FILTERS` is in `components/theme-filter.tsx`, which is a `"use client"` module, so the server page cannot call `.find` on it. Confirmed by build error (see RED/GREEN below). Human answer from `refract ask`: Option A, use a client component that reads `THEME_FILTERS`, no duplicate label map, and do not touch `components/theme-filter.tsx`.
- Creator link: `httpUrl()` returns the stored `url` only when it parses with protocol `http:` or `https:`. Such a link has `target="_blank" rel="noopener noreferrer"`. Other values render as plain text.
- Voice labels are a display map: `self-recorded` -> `Self-recorded`, `tts-api` -> `TTS API`, `vieneu-tts` -> `VieNeu-TTS`. The spec gives no label text. The `VieNeu-TTS` spelling is an assumption.
- Duration is `m:ss` using the same rounding as `components/video-card.tsx`. The function is local to the page because the card's helper is not exported and the card file is out of scope.
- Published date: `toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })` inside `<time dateTime={publishedAt}>`. UTC avoids a one-day shift for date-only values.
- `lang={video.lang}` is on the `<h1>` and on the transcript `<section>`. `whitespace-pre-line` is on the transcript `<p>`.

### Spec deviations
- The theme badge is rendered by `ThemeBadge` (client export in `components/video-player.tsx`), not by a direct `THEME_FILTERS` call in the page. See Decisions made.

### Tradeoffs accepted
- `ThemeBadge` lives in the player file, which is a naming mismatch. A later phase should move `THEME_FILTERS` to a server-safe module, or move `ThemeBadge` to its own file. Either change touches files outside Phase 4's set.
- The `VideoPlayer` `<video>` has a `biome-ignore` for `useMediaCaption`. The transcript is on the page, but no caption track exists.

### Assumptions
- The fixture transcript text in the static HTML is the escaped form (`&amp;`). The grep check uses that form.

### Follow-ups for human
- Confirm the voice label text (`VieNeu-TTS` in particular).
- Browser check: `Video unavailable` appears when `videoUrl` fails to load. Not browser-tested here; the static HTML cannot show it.

### Test evidence
- RED -> GREEN:
  - RED: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test -f out/v/intro-dark/index.html` -> build exit 0; `test -f` exit 1; `ls out/v` -> `No such file or directory`.
  - Intermediate RED (build error, not a behavioral assertion; recorded because it shaped the design): with `THEME_FILTERS.find` in the server page, `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> `TypeError: v.THEME_FILTERS.find is not a function` in `app/v/[slug]/page.tsx`.
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit 0; routes `/v/intro-dark`, `/v/paper-overview`, `/v/tour-world3d` prerendered (SSG).
  - GREEN: `test -f out/v/intro-dark/index.html` -> exit 0. `grep -o 'Chào mừng bạn đến với C&amp;G Vocational Services\.'` -> matched once.
  - GREEN: `grep -o '<video[^>]*>' out/v/*/index.html` -> 3 `<video controls="" playsInline="" preload="metadata" ...>` tags, none with `autoplay`. `out/index.html` -> 0 `<video` tags; card links `/v/intro-dark/`, `/v/paper-overview/`, `/v/tour-world3d/`.
  - Lint: `pnpm lint` -> exit 0; `Checked 25 files in 10ms. No fixes applied.`
  - Empty manifest (known failure, fixed in Task 3): `pnpm build` -> exit 1; `Page "/v/[slug]" returned an empty array from "generateStaticParams()". With "output: export", at least one route must be generated.` Probe: `dynamicParams = true` -> exit 1; `"dynamicParams: true" cannot be used with "output: export"`. The probe edit was reverted.
- Root cause (bugfix only): none

## Task 3

### Decisions made
- `app/layout.tsx`: added `export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://gallery.example.com") }`. The layout had no metadata export before, so nothing existing was changed.
- Empty manifest: `generateStaticParams` returns `[{ slug: "_none" }]` when `getVideos()` is empty. Static export needs at least one generated route (Task 2 error). An empty array fails the build, and `dynamicParams = true` is rejected with `output: "export"`. `_none` contains `_`, which the slug regex `^[a-z0-9-]+$` rejects, so no real video can match it. Its page calls `notFound()` and builds `out/v/_none/index.html`, which is 404 content with `<meta name="robots" content="noindex"/>`. No placeholder video is added.
- `generateMetadata`: `title` = video title. `description` = script with whitespace collapsed, trimmed, first 160 characters. The trim is an addition to the spec. Canonical is the relative `/v/<slug>/`, which `metadataBase` resolves. `openGraph` has `type: "video.other"`, the title, the description, and `images: [posterUrl]`. `twitter` has `card: "summary_large_image"`, the title, the description, and the poster.
- JSON-LD: `VideoObject` with `name`, `description`, `thumbnailUrl`, `uploadDate`, `duration`, `contentUrl`, `inLanguage`, and `creator` (`Person`). `creator.url` is included only when it is http or https. `duration` is `PT<minutes>M<seconds>S` from rounded seconds, for example `PT0M42S` and `PT1M6S`. Minutes are not split into hours, which ISO 8601 still accepts.
- JSON-LD escape: `jsonLd(data) = JSON.stringify(data).replace(/</g, "\\u003c")`, in the page file. Biome rule `lint/security/noDangerouslySetInnerHtml` is suppressed on that one `<script>`, with the reason in the comment. The spec permits this exception.
- `app/sitemap.ts`: `/` and each `/v/<slug>/`, built with `new URL(path, site)`, so the output has no doubled slash. `lastModified` is the `publishedAt` string for video pages. The home entry has no `lastModified`.
- `app/robots.ts`: `rules: { userAgent: "*", allow: "/" }` and `sitemap: <site>/sitemap.xml`.
- Both sitemap and robots use `export const dynamic = "force-static"`.
- The `NEXT_PUBLIC_SITE_URL` default string is repeated in `layout.tsx`, `sitemap.ts`, and `robots.ts`. No shared module is in the Phase 4 file set.
- Tool side effect: `pnpm exec tsc --noEmit` (exit 0) created `tsconfig.tsbuildinfo` at the repo root. It is not ignored, so I deleted it.

### Spec deviations
- none

### Tradeoffs accepted
- An empty-manifest build emits `out/v/_none/index.html`. The page is a noindex 404, is not in the sitemap, and nothing links to it. A static host can still serve it at `/v/_none/`.
- `formatDuration` in `app/v/[slug]/page.tsx` duplicates the private helper in `components/video-card.tsx`. The card file is out of scope.
- The default site URL is repeated three times (see Decisions made).

### Assumptions
- `NEXT_PUBLIC_SITE_URL` is an origin with no path prefix. `new URL(path, site)` drops any path in the value.
- `openGraph.type: "video.other"` type-checks. `pnpm exec tsc --noEmit` exit 0 confirms this.

### Follow-ups for human
- Set `NEXT_PUBLIC_SITE_URL` in the deployment environment. The default `https://gallery.example.com` is a placeholder.
- Once real videos exist, the `_none` route is unused. A later phase can remove it or add host-level 404 handling for `/v/_none/`.
- Move `THEME_FILTERS` to a server-safe module, so `ThemeBadge` can move out of `components/video-player.tsx` (see Task 2).

### Test evidence
- RED -> GREEN:
  - RED: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` (before Task 3 changes) -> exit 0; `grep -l 'og:image' out/v/*/index.html` -> exit 1; `grep -l 'application/ld+json' out/v/*/index.html` -> exit 1; `grep -q '/v/' out/sitemap.xml` -> exit 2 (`out/sitemap.xml` missing); `grep -qi sitemap out/robots.txt` -> exit 2 (`out/robots.txt` missing).
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit 0; `og:image` and `application/ld+json` in all three `out/v/<slug>/index.html`; `out/sitemap.xml` lists `https://gallery.example.com/`, `/v/intro-dark/` (lastmod `2026-11-01`), `/v/paper-overview/` (`2026-11-05`), `/v/tour-world3d/` (`2026-11-10`); `out/robots.txt` has `Sitemap: https://gallery.example.com/sitemap.xml`.
  - Empty manifest: before the sentinel, `pnpm build` -> exit 1 (`returned an empty array from "generateStaticParams()"`). After the sentinel, `pnpm build` -> exit 0; routes `/robots.txt`, `/sitemap.xml`, and `/v/_none` generated; `out/sitemap.xml` lists only `/`.
  - JSON-LD escape (temp manifest at `/tmp/phase4-escape/videos.json`, deleted after use): entry 0 title `</script><b>x`, entry 1 `creator.url` `javascript:alert(1)`. `VIDEOS_MANIFEST=/tmp/phase4-escape/videos.json pnpm build` -> exit 0. The JSON-LD `name` is `"</script><b>x"`. `grep -c '</script><b>x' out/v/intro-dark/index.html` -> 0. `javascript:` occurrences in `out/v/paper-overview/index.html` -> 0.
  - Non-http creator: same temp build (`/tmp/phase4-creator/videos.json`, deleted after use). `out/v/paper-overview/index.html` shows `Creator: C&amp;G Vocational Services` with no anchor.
  - External creator links: `grep -o '<a [^>]*target="_blank"[^>]*>'` -> two anchors (`intro-dark`, `tour-world3d`), each with `rel="noopener noreferrer"`.
  - Lint: `pnpm lint` -> exit 0; `Checked 27 files in 14ms. No fixes applied.`
  - Tests: `pnpm test` -> exit 0; `31 passed (31)`.
  - Type check: `pnpm exec tsc --noEmit` -> exit 0.
- Root cause (bugfix only): none

## Final checks (fresh, after the last edit)

- `pnpm lint` -> exit 0; `Checked 27 files in 14ms. No fixes applied.`
- `pnpm test` -> exit 0; `31 passed (31)`.
- `pnpm build` (shipped empty manifest) -> exit 0; `out/v/_none` only.
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(ls -d out/v/*/ | wc -l)" -eq 3 && grep -q 'application/ld+json' out/v/*/index.html && grep -q '/v/' out/sitemap.xml && grep -qi sitemap out/robots.txt` -> exit 0.
- `grep -rl '<video autoplay' out` -> no matches. `out/index.html` has three card links (`/v/intro-dark/`, `/v/paper-overview/`, `/v/tour-world3d/`) and 0 `<video` tags.
- `pnpm build` (empty manifest, run again last) -> exit 0, so `out/` reflects the shipped manifest.
- Not run: browser check of the `Video unavailable` fallback. No browser tooling was used (Playwright is out of scope).

## Fix 1: missed error before hydration

Review finding: the server-rendered `<video>` can fire `error` before React hydrates it. `onError` is attached during hydration, so the event is missed and the player stays visible.

### Decisions made
- Added `videoRef` (`useRef<HTMLVideoElement>(null)`) to the `<video>`.
- Added a `useEffect` with an empty dependency list. It calls `setFailed(true)` when `videoRef.current?.error` is non-null. It runs once after mount.
- Kept the `onError` handler for errors after hydration.
- Added one comment line above the effect, matching the file's one-line comment style.
- Changed nothing else. `git diff --stat` shows 8 insertions and 1 deletion in `components/video-player.tsx`.

### Spec deviations
- none

### Tradeoffs accepted
- The `error` check runs once after mount. Errors after mount go through `onError`. Both paths must stay in place.

### Assumptions
- A browser sets `HTMLMediaElement.error` on a server-rendered `<video>` whose load fails before hydration. The scratch check models this by setting `error` on the element before `hydrateRoot`. This matches the review finding and was not checked in a real browser.
- jsdom does not load media. The scratch check overrides `error` on the element instance.

### Follow-ups for human
- Check the `Video unavailable` fallback in a real browser with a broken `src`. This phase has no browser check. Playwright is out of scope for Phase 4, so it was not run.

### Test evidence
- Scratch check: `/tmp/checks/video-player-fix.test.mjs`, outside the repo and not committed. Cases: error before hydration, error event after hydration, and no error.
- Setup failure, not a behavioral result: the first RED run used `/tmp/checks/video-player.old.tsx` and failed with `Error: Cannot find package 'react'`. No assertion ran. The old copy was moved to `/tmp/checks/old/video-player.tsx`, and `/tmp/checks/old/node_modules` is a symlink to the repo `node_modules`.
- RED -> GREEN:
  - RED: `VIDEO_PLAYER_PATH=/tmp/checks/old/video-player.tsx node_modules/.bin/vitest run --config /tmp/checks/vitest.config.mjs video-player-fix` from the repo -> exit 1; `Tests  1 failed | 2 passed (3)`; `AssertionError: expected undefined to be 'Video unavailable'` in `shows Video unavailable when the error fired before hydration`. The other two cases pass on the old code, as expected.
  - GREEN: `VIDEO_PLAYER_PATH=$PWD/components/video-player.tsx node_modules/.bin/vitest run --config /tmp/checks/vitest.config.mjs video-player-fix` from the repo -> exit 0; `Tests  3 passed (3)`.
  - `pnpm lint` -> exit 0; `Checked 27 files in 8ms. No fixes applied.`
  - `pnpm test` -> exit 0; `31 passed (31)`.
  - `pnpm build` with the shipped empty manifest -> exit 0; routes `/robots.txt`, `/sitemap.xml`, and `/v/_none` generated.
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(ls -d out/v/*/ | wc -l)" -eq 3 && grep -q 'application/ld+json' out/v/*/index.html && grep -q '/v/' out/sitemap.xml && grep -qi sitemap out/robots.txt` -> exit 0.
  - `pnpm build` with the shipped empty manifest, run last -> exit 0. `out/v` contains only `_none`. `grep -rl '<video autoplay' out` -> no matches.
- Root cause (bugfix only): missed pre-hydration `error` event, as stated in the review finding. The RED case reproduces it in jsdom: the event dispatched before `hydrateRoot` never reaches the old player.

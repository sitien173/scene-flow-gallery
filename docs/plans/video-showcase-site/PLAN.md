# Video Showcase Site Plan

**Design:** [DESIGN.md](DESIGN.md)
**Context key:** `video-showcase-site`
**Base:** `refs/plans/video-showcase-site/base` (`84afae5`)
**Commit:** `feat: build scene-flow video showcase gallery`

## Outcome & Scope

A static Next.js 16 gallery in `~/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.

Preserved invariants:

- `content/videos.json` is the single source of video data.
- Every `videoUrl` and `posterUrl` uses the configured media host.
- Slugs are unique and match `^[a-z0-9-]+$`.
- No credentials, media files, or build output in Git.

Out of scope:

- Any change to `~/projects/scene-flow`. The README link is added by the maintainer after launch.
- Cloudflare account setup, R2 uploads, domain selection, deployment.
- Every non-goal listed in `DESIGN.md`.

## Baseline Evidence

- The repository at base holds one empty commit. No `package.json` exists, so `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` cannot run. Phase 1 establishes them.
- Toolchain on the coordinator host: Node `v24.18.0`, pnpm `11.22.0`, FFmpeg and ffprobe `8.0.1`.

### Phase 1: Toolchain scaffold that builds a static export

**Phase Request:** Scaffold a Next.js 16 App Router project with TypeScript, Tailwind CSS v4 using CSS-first config in `app/globals.css`, shadcn/ui on Base UI, Biome, and Vitest, using pnpm. Configure static export. Verify current setup steps for Next.js 16, shadcn/ui with Base UI, Tailwind v4, Biome, and Vitest with `npx ctx7@latest` before running generators. Do not use ESLint or `next lint`.
**Goal:** `pnpm lint`, `pnpm test`, and `pnpm build` pass on a minimal placeholder home page and `pnpm build` writes `out/index.html`.
**Depends on:** none
**Invariants & Boundaries:** Do not touch `docs/plans/`. No app features beyond a placeholder heading. No ESLint config.
**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `biome.json`, `vitest.config.ts`, `components.json`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/utils.ts`, `.gitignore`, `.env.example`, `next-env.d.ts`
**Tasks:**
1. Generate the project and remove ESLint artifacts. Add scripts: `dev`, `build`, `lint` as `biome check .`, `format` as `biome format --write .`, `test` as `vitest run`.
2. Set `output: 'export'`, `trailingSlash: true`, and `images: { unoptimized: true }` in `next.config.ts`.
3. Initialize shadcn/ui with Base UI primitives and `lib/utils.ts`. Load Be Vietnam Pro through `next/font/google` with `latin` and `vietnamese` subsets in `app/layout.tsx`.
4. Write `.gitignore` covering `node_modules/`, `.next/`, `out/`, `media/`, `test-results/`, `playwright-report/`, and `.env*` except `.env.example`. Write `.env.example` with `NEXT_PUBLIC_MEDIA_HOST=media.example.com` and `NEXT_PUBLIC_SITE_URL=https://gallery.example.com`.
**Acceptance Criteria:**
- `pnpm lint`, `pnpm test`, and `pnpm build` exit 0.
- `out/index.html` exists after `pnpm build`.
- No `eslint` dependency or config file exists.
**Reviewer Checklist:**
- Versions are Next.js 16, React 19, Tailwind v4, Zod 4 if added, and match docs fetched through `ctx7`.
- `vitest.config.ts` passes with zero test files without hiding real failures, for example `passWithNoTests: true`.
- `.gitignore` excludes `.env` but keeps `.env.example`.
**Verification Checks:**
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build && test -f out/index.html`

### Phase 2: Validated video manifest

**Phase Request:** Add a Zod 4 schema and loader for the video manifest defined in `DESIGN.md` section "Architecture and Data Flow". The loader reads `process.env.VIDEOS_MANIFEST` when set, else `content/videos.json`, validates it, and throws an error naming the entry index and field on failure. The media host comes from `process.env.NEXT_PUBLIC_MEDIA_HOST`, defaulting to `media.example.com`. Ship `content/videos.json` as an empty array. Add a fixture manifest with three entries, one per theme, for tests and e2e.
**Goal:** Invalid manifests fail with a precise message; valid ones load as typed data.
**Depends on:** Phase 1
**Invariants & Boundaries:** Schema fields, enums, and rules exactly as in `DESIGN.md`. No UI changes. Fixture URLs use `https://media.example.com/`.
**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `lib/videos.ts`, `lib/videos.test.ts`, `content/videos.json`, `tests/fixtures/videos.json`
**Tasks:**
1. Write failing Vitest cases: valid fixture loads; duplicate slug, invalid slug `Bad Slug`, foreign host on `videoUrl` and on `posterUrl`, and missing `script` each reject with the index and field in the message; empty array loads.
2. Implement the schema with `superRefine` for slug uniqueness, export the `Video` type, `getVideos()`, and `getVideo(slug)`.
3. Write the fixture with Vietnamese and English titles, distinct themes, and `lang` tags `vi` and `en`.
**Acceptance Criteria:**
- All new Vitest cases pass.
- `pnpm build` passes with the empty `content/videos.json`.
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` passes.
**Reviewer Checklist:**
- Host check compares parsed URL hostname, not a string prefix.
- `publishedAt` and `lang` validation are not looser than `DESIGN.md`.
- Errors surface at build time, not silently filtered.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build`

### Phase 3: Gallery grid with theme filter

**Phase Request:** Build the `/` page from `DESIGN.md`: a responsive grid of 9:16 cards linking to `/v/<slug>/`, a theme toggle group with `aria-pressed` for all, `dark`, `paper`, `world3d`, filter state in `?theme=`, a polite live region announcing the result count, empty states for an empty manifest and for a filter with no matches with a "Show all" control. Cards show a lazy poster `<img>`, title, theme badge, and duration. A muted, looping `<video preload="none">` mounts only on hover or keyboard focus and unmounts on leave, and never mounts on `(hover: none)` devices or under `prefers-reduced-motion: reduce`. A failed poster keeps title and theme visible. Load the `emil-design-eng` and `apple-design` skills for visual decisions.
**Goal:** Visitors browse and filter all manifest videos on the home page.
**Depends on:** Phase 2
**Invariants & Boundaries:** Static export only; read `?theme=` on the client inside a `Suspense` boundary. No Zustand or TanStack Query. No detail page work.
**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `package.json`, `pnpm-lock.yaml`
- Create: `components/video-grid.tsx`, `components/video-card.tsx`, `components/theme-filter.tsx`, `components/ui/*` as added by the shadcn CLI
**Tasks:**
1. Add the shadcn components the grid needs through the shadcn CLI.
2. Build the filter and grid with URL state and the live result count.
3. Build the card with the hover or focus preview rules and poster fallback.
**Acceptance Criteria:**
- With the fixture manifest, `out/index.html` contains three card links to `/v/<slug>/`.
- An unknown `?theme=` value behaves as all.
- `pnpm build` with the empty manifest renders the empty state.
**Reviewer Checklist:**
- No `<video>` element exists in the initial HTML.
- Preview respects `(hover: none)` and `prefers-reduced-motion`.
- Filter controls are keyboard operable and announce counts.
- Text uses the entry `lang` attribute.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3`

### Phase 4: Video pages and SEO metadata

**Phase Request:** Build `/v/[slug]` from `DESIGN.md` with `generateStaticParams` and `dynamicParams = false`. Show a native-controls `<video>` with `poster`, `playsInline`, `preload="metadata"`, and no autoplay; title; theme badge; duration; published date; creator credit with optional external link; source notes; and the script as a transcript with the entry `lang`. On video `error`, replace the player with "Video unavailable". Add `metadataBase` from `NEXT_PUBLIC_SITE_URL` defaulting to `https://gallery.example.com`, per-page `generateMetadata` with the poster as `og:image`, `VideoObject` JSON-LD, `app/sitemap.ts`, and `app/robots.ts`, all compatible with static export. Add a back link to `/`.
**Goal:** Each video has a shareable, indexable static page.
**Depends on:** Phase 3
**Invariants & Boundaries:** No modal or intercepting routes. JSON-LD serialized safely against `</script>` injection from manifest text.
**Files:**
- Modify: `app/layout.tsx`
- Create: `app/v/[slug]/page.tsx`, `components/video-player.tsx`, `app/sitemap.ts`, `app/robots.ts`
**Tasks:**
1. Build the static route and player with the unavailable fallback.
2. Add metadata, JSON-LD, sitemap, and robots.
**Acceptance Criteria:**
- With the fixture manifest, `out/v/<slug>/index.html` exists for each of the three slugs and contains `og:image`, `application/ld+json`, and the script text.
- `out/sitemap.xml` lists `/` and the three video pages with absolute URLs.
- `out/robots.txt` references the sitemap.
**Reviewer Checklist:**
- `sitemap.ts` and `robots.ts` declare `export const dynamic = 'force-static'` if the static export requires it.
- JSON-LD escapes `<`.
- External creator links use `rel="noopener noreferrer"`.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(ls -d out/v/*/ | wc -l)" -eq 3 && grep -q 'application/ld+json' out/v/*/index.html && grep -q '/v/' out/sitemap.xml && grep -qi sitemap out/robots.txt`

### Phase 5: End-to-end smoke test and CI

**Phase Request:** Add Playwright with one smoke spec that runs against the static export built from the fixture manifest and served from `out/` by a local static server dev dependency. The spec checks: the grid shows three cards; choosing `paper` shows one card and sets `?theme=paper`; "Show all" or all restores three; clicking a card opens `/v/<slug>/`; the page has a `video` element with controls and the transcript text. Add `pnpm test:e2e`. Add `.github/workflows/ci.yml` running on pull requests and pushes to `main`: pnpm install with frozen lockfile, `pnpm lint`, `pnpm test`, `pnpm build`, fixture build, Playwright browser install, `pnpm test:e2e`.
**Goal:** Regressions in the core browse flow fail CI.
**Depends on:** Phase 4
**Invariants & Boundaries:** Only Chromium in CI. No network media is fetched by the test. No secrets in the workflow.
**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `biome.json`, `vitest.config.ts`
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/ci.yml`
**Tasks:**
1. Write the Playwright config with a `webServer` that builds with `VIDEOS_MANIFEST=tests/fixtures/videos.json` and serves `out/`.
2. Write the smoke spec.
3. Write the CI workflow and exclude `e2e/` from Vitest.
**Acceptance Criteria:**
- `pnpm test:e2e` passes locally.
- `pnpm test` does not pick up `e2e/`.
**Reviewer Checklist:**
- Selectors use roles and accessible names.
- The workflow pins Node 24 and uses the `packageManager` pnpm version.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm exec playwright install chromium && pnpm test:e2e`

### Phase 6: Media preparation script and maintainer docs

**Phase Request:** Write `scripts/prepare-video.sh <input> <slug> <poster-time-seconds>` in bash with `set -euo pipefail`. It validates the slug against `^[a-z0-9-]+$`, checks the input is 9:16 with `ffprobe`, checks the poster time is below the duration, re-encodes to H.264 High `yuv420p` AAC 720x1280 with `-movflags +faststart` into `media/<slug>-v1.mp4`, extracts a 720x1280 WebP poster into `media/<slug>-v1.webp`, and prints a JSON manifest entry with `slug`, `videoUrl`, `posterUrl` built from `NEXT_PUBLIC_MEDIA_HOST` defaulting to `media.example.com`, and `durationSec`, leaving other fields as placeholders. Write `README.md` covering local development, the add-a-video workflow with the exact `wrangler r2 object put ... --remote` commands for MP4 and WebP including `--content-type` and `--cache-control "public, max-age=31536000, immutable"`, credentials through `wrangler login` or `CLOUDFLARE_API_TOKEN` from the shell, environment variables, and Cloudflare Pages settings: build command `pnpm build`, output directory `out`. Verify Wrangler flags with `npx ctx7@latest` first.
**Goal:** The maintainer turns a `scene-flow` render into a gallery entry with documented commands.
**Depends on:** Phase 5
**Invariants & Boundaries:** No credentials or bucket names hard-coded. The script never uploads. Paths with spaces and non-ASCII characters work.
**Files:**
- Create: `scripts/prepare-video.sh`, `README.md`
**Tasks:**
1. Write the script with input validation.
2. Write `README.md`.
**Acceptance Criteria:**
- Running the script on a `scene-flow` reference video produces an H.264 and AAC MP4 at 720x1280 with faststart and a WebP poster.
- A non-9:16 input and an out-of-range poster time each exit non-zero.
- `README.md` documents every command the workflow needs.
**Reviewer Checklist:**
- All variables quoted.
- HEVC and MP3 input converts.
- Printed JSON is valid.
**Verification Checks:**
- `bash -n scripts/prepare-video.sh`
- `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4" sample-solar 1 | python3 -c 'import json,sys; json.load(sys.stdin)'`
- `test "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 media/sample-solar-v1.mp4)" = "h264,720,1280"`
- `test "$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 media/sample-solar-v1.mp4)" = "aac"`
- `test -s media/sample-solar-v1.webp`
- `ffmpeg -v error -f lavfi -i color=c=black:s=1280x720:d=1 -y /tmp/landscape.mp4 && ! scripts/prepare-video.sh /tmp/landscape.mp4 bad-ratio 0`
- `pnpm lint`

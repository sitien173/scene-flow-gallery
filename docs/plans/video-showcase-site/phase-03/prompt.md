# Phase 3: Gallery grid with theme filter

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: The `/` page shows a responsive grid of 9:16 video cards from the manifest with a theme filter. Visitors browse and filter all manifest videos on the home page.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-03/base`
- Prior State:
  - Phase 1: Next.js 16.4.6 static export (`output: "export"`, `trailingSlash: true`, `images.unoptimized`), React 19.3, Tailwind v4 CSS-first in `app/globals.css`, shadcn `base-nova` style on Base UI (`@base-ui/react`), `lucide-react`, Be Vietnam Pro font through `next/font/google` as `--font-sans`, Biome (`pnpm lint`), Vitest. `app/page.tsx` is a placeholder `<h1>`. `lib/utils.ts` exports `cn`. `tsconfig.json` has the `@/*` alias.
  - Phase 2: `lib/videos.ts` exports `Video` type, `parseVideos`, `getVideos()`, `getVideo(slug)`. `getVideos()` reads `process.env.VIDEOS_MANIFEST` (relative to cwd) else `content/videos.json`, and throws on an invalid manifest. `content/videos.json` is `[]`. `tests/fixtures/videos.json` holds three entries: `intro-dark` (theme `dark`, lang `vi`), `paper-overview` (theme `paper`, lang `en`), `tour-world3d` (theme `world3d`, lang `vi`).
  - `Video` fields used here: `slug`, `title`, `theme` (`dark` | `paper` | `world3d`), `posterUrl`, `videoUrl`, `durationSec`, `lang`.
- PNPM NOTE: `/home/ngosi/pnpm-workspace.yaml` is a home-level file outside the repo that makes pnpm treat `/home/ngosi` as workspace root. Pass `--ignore-workspace` to any `pnpm add` or `pnpm install`. Do not edit that file.
- Verify current setup with `npx ctx7@latest` before coding: `npx ctx7@latest library <Name> "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`. At most 3 ctx7 commands per question. Cover shadcn CLI `add` for Base UI based components (toggle group, badge), the Base UI `ToggleGroup` and `Toggle` APIs, and Next.js 16 `useSearchParams` with `output: "export"` and Suspense.
- Visual decisions: load the `emil-design-eng` and `apple-design` skills if your environment has them. If not, apply this brief: restrained neutral palette from the existing CSS variables, generous spacing, one accent at most, rounded cards using the existing `--radius` tokens, subtle CSS-only transitions of 150ms to 200ms with ease-out on `transform` and `opacity` only, visible focus rings, and no motion when `prefers-reduced-motion: reduce`.

Page behavior:

1. `app/page.tsx` is a server component. It calls `getVideos()` at build time so an invalid manifest fails the build, then renders a page heading, and the filter plus grid.
2. Static export constraint: read `?theme=` on the client with `useSearchParams` inside a `Suspense` boundary. At prerender, `useSearchParams` bails out to the Suspense fallback, so the fallback must itself render the full unfiltered grid. Otherwise `out/index.html` would lack the card links.
3. `?theme=` accepts `dark`, `paper`, `world3d`. Any other value, or none, behaves as `all`.
4. Theme filter: a toggle group of four buttons `All`, `Dark`, `Paper`, `World 3D` for `all`, `dark`, `paper`, `world3d`. Exactly one is pressed. Each exposes `aria-pressed`. Operable by keyboard (Tab to reach, Space or Enter to toggle). Choosing a value updates `?theme=` without a scroll jump and without adding history noise (replace). Choosing `all` removes the param.
5. A visually clear result count in a polite live region (`aria-live="polite"`, for example `role="status"`), for example `3 videos` or `1 video in Paper`. It updates when the filter changes.
6. Empty states, each with greppable text:
   - Empty manifest: render text containing `No videos yet`. No filter controls are needed.
   - A filter with no matches: render text containing `No videos match this theme` and a `Show all` button that resets to `all`.
7. Card, one per video: the whole card is a link (`next/link`) to `/v/<slug>/`. It shows, in a 9:16 box (`aspect-[9/16]`): a lazy poster `<img loading="lazy" decoding="async">` with `alt` equal to the title and `width`/`height` attributes or an aspect box to avoid layout shift; the title element with `lang={video.lang}`; a theme badge; and the duration formatted `m:ss`. If the poster fails to load (`onError`), hide the image and keep a neutral placeholder so the title, theme, and duration stay visible.
8. Hover or focus preview: a muted, looping `<video muted loop playsInline preload="none" src={videoUrl}>` mounts only while the card is hovered (pointer enter) or has keyboard focus (focus within), and unmounts on pointer leave or blur. It must never mount when `matchMedia("(hover: none)")` matches or when `matchMedia("(prefers-reduced-motion: reduce)")` matches. Start playback with `play()` and swallow the rejection. No `<video>` element may exist in the server-rendered HTML.
9. Grid: responsive columns, for example 1 column below 480px, 2 columns up to 768px, 3 to 4 columns above. Cards keep 9:16.

## Invariants & Boundaries
- Preserve: Phase 1 and 2 behavior. `pnpm lint`, `pnpm test` (29 tests), and `pnpm build` keep passing. Do not change `lib/videos.ts`.
- Static export only. No Zustand, no TanStack Query, no data fetching at runtime, no server actions.
- Out of Scope: the detail page `/v/[slug]`, SEO metadata, sitemap, robots, Playwright, CI, `app/v/`. The link target `/v/<slug>/` may 404 until Phase 4.
- Debt owned by this phase: `app/globals.css` has `--font-mono: var(--font-geist-mono)` pointing at an undefined variable. Replace the value with a standard system monospace stack, for example `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Change nothing else in that line's block except what the grid needs.
- Do not touch `docs/plans/` except your own phase records. Do not commit; the Coordinator owns Git.

## Files
Allowed production and test paths:
- `app/page.tsx` (modify: server component that calls `getVideos()` and renders the heading, `Suspense`, and grid)
- `app/layout.tsx` (modify only if needed, for example page `<title>` metadata; keep the font setup)
- `app/globals.css` (modify: the `--font-mono` fix and any grid or card utilities that cannot be expressed with Tailwind classes)
- `package.json` (modify: only if the shadcn CLI adds a dependency)
- `pnpm-lock.yaml` (modify: only with `package.json`)
- `components/video-grid.tsx` (create: client component, reads `?theme=`, renders filter, live count, grid, empty states; also exports a small `parseTheme` helper)
- `components/video-card.tsx` (create: client component, card, poster fallback, hover and focus preview)
- `components/theme-filter.tsx` (create: client component, toggle group)
- `components/ui/*` (create: only components added by the shadcn CLI, for example `toggle-group.tsx`, `toggle.tsx`, `badge.tsx`)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-03/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-03/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, `lib/videos.ts`, `content/`, `tests/fixtures/`, or secrets. Add no dependency except what the shadcn CLI installs for the components above.

## Tasks
- task-1: Add the needed shadcn components through the shadcn CLI (`pnpm dlx shadcn@latest add ...`, adjust to the current CLI per ctx7; remember `--ignore-workspace` for any install). Fix the `--font-mono` token.
- task-2: Build the theme filter and the grid with URL state, `parseTheme`, the live result count, and both empty states. Wire `app/page.tsx` to `getVideos()` with the Suspense fallback rendering the full grid.
- task-3: Build the card: poster with fallback, title with `lang`, theme badge, duration, and the hover or focus preview with the `(hover: none)` and reduced-motion guards.
- Verification discipline: there is no unit test file in this phase's file list, so evidence is build output. After each task run `pnpm lint` and `pnpm build` and record the commands and results in `notes.md`. For RED, show the build with the fixture manifest failing the grep check before the grid exists, then passing after.

## Done When
- With the fixture manifest, `out/index.html` contains exactly three distinct card links `href="/v/<slug>/"`.
- `pnpm build` with the empty manifest renders the empty state: `out/index.html` contains `No videos yet`.
- `out/index.html` contains no `<video` element.
- An unknown `?theme=` value behaves as all (by `parseTheme`).
- Filter controls are keyboard operable, expose `aria-pressed`, and the count is announced through a polite live region.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (Baseline: exit 0)
  - `pnpm test` (Baseline: exit 0, 29 tests)
  - `pnpm build` (Baseline: exit 0)
  - `pnpm build && grep -q "No videos yet" out/index.html && ! grep -q "<video" out/index.html` (Baseline: grep fails, no empty state yet)
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3 && ! grep -q "<video" out/index.html` (Baseline: count is 0)
- After the last check, run `pnpm build` once more so `out/` reflects the empty manifest. `out/` is ignored by Git.

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-03/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-03/journal.md`, then return that block and the matching status line from `erp.md`.

# Phase 1: Navy brand theme and Vietnamese home grid

## Goal & Outcome
- Plan Goal: Rebrand the static Next.js gallery as the Góc Nhìn Mở channel site: navy `#16264A` dark-only scheme, amber `#FEAB24` accents, Vietnamese UI, logo header, newest-first grid without the theme filter, side-by-side video page.
- Phase Outcome: The home page renders branded, Vietnamese, filter-free, newest first, and `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` pass.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/gallery-brand-redesign/phase-01/base`
- Prior State: Baseline passes: lint (31 files), unit 31/31, build, e2e 10/10. Design: `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/DESIGN.md` (read sections "Theme", "Layout", "Home", "Grid", "Card", "Errors and Edge Cases", "Testing").
- Code Context:
  - Next.js 16.4.6, React 19, Tailwind v4 CSS-first in `app/globals.css`, shadcn tokens in `:root` and `.dark`, Biome lint. Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API; this Next version differs from training data.
  - `app/layout.tsx`: Be Vietnam Pro font, `<html lang="en">`, `metadata.metadataBase`.
  - `app/page.tsx`: `getVideos()` then `<Suspense fallback={<VideoGridFallback/>}><VideoGrid/></Suspense>`, empty state `No videos yet.`
  - `components/video-grid.tsx`: client component with theme filter, `useSearchParams`, `parseTheme`, count text, `CardList`.
  - `components/video-card.tsx`: client card with poster `<img>` (biome-ignore comment for `noImgElement`), hover preview guarded by `(hover: none)` and `prefers-reduced-motion`, `Badge` with theme label, duration text, local `formatDuration`.
  - `components/theme-filter.tsx` exports `THEME_FILTERS`, still imported by `components/video-player.tsx` (Phase 2 removes it). Do not delete it now.
  - `e2e/smoke.spec.ts`: Playwright; fixture `tests/fixtures/videos.json` (slugs and dates: `intro-dark` 2026-11-01, `paper-overview` 2026-11-05, `tour-world3d` 2026-11-10).

## Invariants & Boundaries
- Preserve: static export; manifest schema and `getVideos` order (sort a copy in the page); `lib/videos.test.ts`; hover preview behavior and its media-query guards; card link `href` `/v/<slug>/`; card link accessible name contains the title; JSON-LD and metadata.
- Out of Scope: `app/v/[slug]/page.tsx`, `components/video-player.tsx`, `components/theme-filter.tsx`, `components/ui/*`, `lib/`, `README.md`, `package.json`, `pnpm-lock.yaml`, `scripts/`, `content/`. No new dependencies. Do not commit; do not run git commands that change state. If `next dev` creates `AGENTS.md` or changes `next-env.d.ts`, delete `AGENTS.md` and run `git checkout -- next-env.d.ts`.

## Files
Allowed production and test paths:
- `app/globals.css` (modify: navy tokens in `:root`; delete `.dark` block; keep `@custom-variant dark`; base focus outline solid amber, not `ring/50`)
- `app/layout.tsx` (modify: `lang="vi"`, add `dark` to `<html>` className, export `viewport` with `colorScheme: "dark"` and `themeColor: "#16264A"`)
- `app/page.tsx` (modify: logo `<h1>`, newest-first sort with `toSorted`, no `Suspense`, `p-4 sm:p-8`, empty state `Chưa có video nào.`)
- `components/video-grid.tsx` (modify: server component, card list only, `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, `gap-3 sm:gap-6`)
- `components/video-card.tsx` (modify: remove Badge and `THEME_FILTERS`; black poster background; duration pill; 2-line title clamp)
- `e2e/smoke.spec.ts` (modify: home tests per task-1)
- `public/brand/c1-lockup-white.webp` (create: copy of `/home/ngosi/projects/tiktok-gocnhinmo/brand/logos/c1-lockup-white.webp`, 899x200)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-01/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-01/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, dependencies, or secrets.

## Tasks
- task-1: Update `e2e/smoke.spec.ts` first.
  - Test "grid shows three cards": replace the `3 videos` text assertion with an href order assertion: `/v/tour-world3d/`, `/v/paper-overview/`, `/v/intro-dark/`.
  - Delete test "theme filter narrows and restores".
  - Replace test "unknown theme behaves as all" with a test that `/?theme=paper` shows all 3 cards.
  - In "hover preview mounts and unmounts", hover the `<h1>` named `Góc Nhìn Mở` instead of `Scene Flow Gallery`.
  - In "broken poster keeps text visible", remove the theme-label assertion and the `THEME_LABELS` constant; keep the title and duration assertions. Keep the `theme` field in the `FixtureVideo` type (Phase 2 removes it).
  - Run `pnpm test:e2e`; record the RED failures in notes.
- task-2: Theme and layout.
  - `:root` tokens: background `#16264A`; card, popover, secondary, muted, accent `#1F3360`; foreground and the matching `-foreground` tokens near-white (for example `oklch(0.97 0 0)`); muted-foreground `#B8C2D9`; primary and ring `#FEAB24`; primary-foreground `#16264A`; border and input white at 10% and 15%; keep destructive, chart, sidebar, and radius tokens present with navy-appropriate values.
  - Delete the `.dark { ... }` block. Base layer: replace `outline-ring/50` with a solid amber outline.
  - Layout: `lang="vi"`, `dark` class, `viewport` export. Confirm the export shape in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`.
  - Copy the logo file to `public/brand/c1-lockup-white.webp`.
- task-3: Home page, grid, card.
  - `app/page.tsx`: `<h1>` contains `<img src="/brand/c1-lockup-white.webp" width={899} height={200} alt="Góc Nhìn Mở" />` with a sensible display height (about `h-8 w-auto` on phones, larger from `sm`) and the `// biome-ignore lint/performance/noImgElement: ...` comment pattern from `video-card.tsx`. Sort `getVideos().toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))`. Render the grid directly without `Suspense`.
  - `components/video-grid.tsx`: drop `"use client"`, `parseTheme`, router hooks, filter, count, "no match" branch, `VideoGridFallback`. Export one list component used by the page.
  - `components/video-card.tsx`: poster box `bg-black`; duration pill absolutely positioned bottom-right inside the poster box, `rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums`; title `<h2>` with `line-clamp-2 leading-normal`; remove the badge row. Keep every hover, focus, and media-query line unchanged. Keep a solid amber focus ring on the link (no `/50`).
  - Run all four checks.

## Done When
- `out/index.html` from `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` contains `lang="vi"`, class `dark` on `<html>`, `/brand/c1-lockup-white.webp`, and card links in order `/v/tour-world3d/`, `/v/paper-overview/`, `/v/intro-dark/`.
- No `ToggleGroup`, `Badge`, `useSearchParams`, or `Suspense` import in `app/page.tsx`, `components/video-grid.tsx`, `components/video-card.tsx`.
- `components/video-grid.tsx` has no `"use client"`.
- `app/globals.css` has no `.dark {` block and no light token values.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (Baseline: pass, 31 files)
  - `pnpm test` (Baseline: 31 passed)
  - `pnpm build` (Baseline: pass)
  - `pnpm test:e2e` (Baseline: 10 passed; expected after phase: 9 passed, since one filter test is deleted)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-01/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-01/journal.md`, then return that block and the matching status line from `erp.md`.

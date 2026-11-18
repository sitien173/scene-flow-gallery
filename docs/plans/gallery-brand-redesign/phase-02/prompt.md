# Phase 2: Side-by-side video page, cleanup, and README

## Goal & Outcome
- Plan Goal: Rebrand the static Next.js gallery as the Góc Nhìn Mở channel site: navy `#16264A` dark-only scheme, amber `#FEAB24` accents, Vietnamese UI, logo header, newest-first grid without the theme filter, side-by-side video page.
- Phase Outcome: The video page renders side-by-side and Vietnamese, the orphaned filter and badge files are gone, the README matches, and `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` pass.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/gallery-brand-redesign/phase-02/base`
- Prior State: Phase 1 is committed (navy tokens in `app/globals.css`, `lang="vi"` + `dark` class, logo header, server `VideoGrid`, card with duration pill). Checks at phase base: lint pass (31 files), unit 31/31, build pass, e2e 9/9. Design: `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/DESIGN.md` (read sections "Video page", "Errors and Edge Cases", "Migration", "Testing").
- Code Context:
  - Next.js 16.4.6, React 19, Tailwind v4, Biome lint. Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API; this Next version differs from training data.
  - `app/v/[slug]/page.tsx`: server page; imports `ThemeBadge, VideoPlayer` from `@/components/video-player`; `VOICE_LABELS` at line 9; `generateMetadata`; JSON-LD script; date via `toLocaleDateString("en-US", ...)` at line 83; back link `All videos` at line 118; `<ThemeBadge>` at line 124; production details including `Voice source:` at line 149; `Transcript` heading at line 161.
  - `components/video-player.tsx`: client component; imports `THEME_FILTERS` from `@/components/theme-filter`; exports `ThemeBadge` (lines 13 to 20) and `VideoPlayer` with a post-mount `videoRef.current?.error` check and a `role="status"` fallback.
  - `components/theme-filter.tsx`, `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx`, `components/ui/badge.tsx` become orphaned after this phase.
  - `e2e/smoke.spec.ts`: Playwright; fixture `tests/fixtures/videos.json`; `FixtureVideo` type still has `theme`.

## Invariants & Boundaries
- Preserve: static export; `generateMetadata` output and JSON-LD fields identical for the same manifest; `/v/<slug>/` URLs; creator link behavior; the post-mount `videoRef.current?.error` check and `role="status"` fallback; date formatting only in the server component.
- Out of Scope: `lib/`, `app/sitemap.ts`, `app/robots.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/video-card.tsx`, `components/video-grid.tsx`, `scripts/`, `content/`, `package.json`, `pnpm-lock.yaml`. No new dependencies. Do not commit; do not run git commands that change state. If `next dev` creates `AGENTS.md` or changes `next-env.d.ts`, delete `AGENTS.md` and run `git checkout -- next-env.d.ts`.

## Files
Allowed production and test paths:
- `app/v/[slug]/page.tsx` (modify)
- `components/video-player.tsx` (modify)
- `e2e/smoke.spec.ts` (modify)
- `README.md` (modify)
- `components/theme-filter.tsx` (delete)
- `components/ui/toggle.tsx` (delete)
- `components/ui/toggle-group.tsx` (delete)
- `components/ui/badge.tsx` (delete)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-02/notes.md` (create from the notes template; append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-02/journal.md` (create from the journal template; append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, phase-01 records, dependencies, or secrets.

## Tasks
- task-1: Update `e2e/smoke.spec.ts` video page tests first: transcript heading `Lời thoại`; fallback text `Không phát được video` and the matching test title; remove theme-label assertions on the video page; remove `theme` from the `FixtureVideo` type. Add an assertion that the back link `Tất cả video` exists. Run `pnpm test:e2e`; record the RED failures in notes.
- task-2: Video page and player.
  - `app/v/[slug]/page.tsx`: container `mx-auto max-w-5xl p-4 sm:p-8`. Below `md`, stacked: player then details. From `md`, two columns, player left, details right (for example `md:grid md:grid-cols-[auto_1fr] md:gap-8 md:items-start`). Player width capped at `calc((100svh - 8rem) * 9 / 16)` so the whole 9:16 player is visible at 1280x720; on phones it is full width.
  - Right column order: back link `← Tất cả video` to `/`; `<h1>` title; meta line `<date> · <duration>` where the date uses `toLocaleDateString("vi-VN", { dateStyle: "long", timeZone: "UTC" })`; `<h2>` `Lời thoại` with the transcript; then a footer note in small muted text with `Người tạo`, `Giọng đọc`, `Quay màn hình: có | không`, and `Ghi chú` when notes exist, keeping the creator link behavior.
  - `VOICE_LABELS` values become `Tự thu âm`, `TTS API`, `VieNeu-TTS` (same keys, in the existing key order).
  - Keep `generateMetadata` and the JSON-LD script unchanged.
  - `components/video-player.tsx`: remove `ThemeBadge` and the `THEME_FILTERS` import; black player background; fallback text `Không phát được video`. Keep the error check and `role="status"`.
- task-3: Delete the four orphaned files. Confirm `grep -rnE "theme-filter|toggle-group|ui/toggle|ui/badge|ThemeBadge|THEME_FILTERS" app components e2e` prints nothing.
- task-4: `README.md`: line 3 drops theme filtering; "Add a video" step 2 recommends poster time `0` because frame 0 has no caption; the empty-state sentence uses `Chưa có video nào.`. Keep other README content unchanged.
- Run all four checks.

## Done When
- `out/v/intro-dark/index.html` from `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` contains `Lời thoại`, `Tất cả video`, `tháng 11, 2026`, and an `application/ld+json` script.
- `grep -rnE "theme-filter|toggle-group|ui/toggle|ui/badge|ThemeBadge|THEME_FILTERS" app components e2e` prints nothing.
- `README.md` contains no `filtered by theme` and no `No videos yet`.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (phase base: pass, 31 files; file count drops after deletions)
  - `pnpm test` (phase base: 31 passed)
  - `pnpm build` (phase base: pass)
  - `pnpm test:e2e` (phase base: 9 passed)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-02/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/gallery-brand-redesign/phase-02/journal.md`, then return that block and the matching status line from `erp.md`.

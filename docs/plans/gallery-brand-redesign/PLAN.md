# Gallery Brand Redesign Plan

**Design:** [DESIGN.md](DESIGN.md)
**Context key:** `gallery-brand-redesign`
**Base:** `refs/plans/gallery-brand-redesign/base` (`746d365`)
**Commit:** `feat: rebrand gallery as the Góc Nhìn Mở channel site`

## Outcome & Scope

The gallery becomes the Góc Nhìn Mở channel site: navy `#16264A` dark scheme with amber `#FEAB24` accents, Vietnamese UI, logo header, newest-first 2/3/4-column grid without the theme filter, and a side-by-side video page.

Preserved invariants:

- Static export with `trailingSlash: true`; `/v/<slug>/` URLs and the `_none` route.
- Manifest schema and validation in `lib/videos.ts`, including `theme`. `getVideos` keeps manifest order.
- `lib/videos.test.ts` unchanged.
- JSON-LD, `generateMetadata`, `app/sitemap.ts`, `app/robots.ts` unchanged.
- Hover preview guards for `(hover: none)` and `prefers-reduced-motion: reduce`.
- Video fallback behavior: a failed video shows a `role="status"` message.
- No new dependencies; `package.json` and `pnpm-lock.yaml` unchanged.

Out of scope:

- `scripts/prepare-video.sh`, `content/videos.json`, R2 uploads.
- Removing `@base-ui/react` or `class-variance-authority`.
- `AGENTS.md` and `next-env.d.ts` changes written by `next dev`.
- Every non-goal listed in `DESIGN.md`.

## Baseline Evidence

Recorded at `0dbb310` (base `746d365` plus the committed `DESIGN.md`), Node `v24.18.0`, pnpm `11.22.0`:

- `pnpm lint`: pass, 31 files checked, no fixes.
- `pnpm test`: pass, 1 file, 31 tests.
- `pnpm build`: pass, static export including `/v/_none`.
- `pnpm test:e2e`: pass, 10 tests.

### Phase 1: Navy brand theme and Vietnamese home grid

**Phase Request:** Apply the navy brand theme site-wide and rebuild the home page per `DESIGN.md` sections "Theme", "Layout", "Home", "Grid", and "Card". Replace the shadcn token values in `app/globals.css` `:root` with the navy set, delete the `.dark` block, keep `@custom-variant dark`, and make the base focus outline solid amber. In `app/layout.tsx` set `lang="vi"`, add `dark` to the `<html>` class list, and export `viewport` with `colorScheme: "dark"` and `themeColor: "#16264A"`; confirm the `viewport` export shape in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`. Copy `/home/ngosi/projects/tiktok-gocnhinmo/brand/logos/c1-lockup-white.webp` to `public/brand/c1-lockup-white.webp` and render it as a plain `<img width={899} height={200} alt="Góc Nhìn Mở">` inside the home `<h1>`, reusing the `biome-ignore lint/performance/noImgElement` comment pattern from `components/video-card.tsx`. Sort videos newest first in `app/page.tsx` with `toSorted` on `publishedAt`; drop `Suspense`. Reduce `components/video-grid.tsx` to a server component exporting the card list with `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`. In `components/video-card.tsx`, remove the badge and `THEME_FILTERS`, add a `bg-black/60 text-white` duration pill over the poster, use a black poster background, and clamp the title to 2 lines with `leading-normal`. Empty state text `Chưa có video nào.`
**Goal:** The home page renders branded, Vietnamese, filter-free, newest first, and every check passes.
**Depends on:** none
**Invariants & Boundaries:** Do not touch `app/v/[slug]/page.tsx`, `components/video-player.tsx`, `components/theme-filter.tsx`, `components/ui/*`, `lib/`, `README.md`, `docs/plans/`, `package.json`, `pnpm-lock.yaml`. `components/theme-filter.tsx` stays because `components/video-player.tsx` still imports it until Phase 2. Keep hover preview logic in `video-card.tsx` unchanged.
**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `components/video-grid.tsx`
- Modify: `components/video-card.tsx`
- Modify: `e2e/smoke.spec.ts`
- Create: `public/brand/c1-lockup-white.webp`
**Tasks:**
1. Update `e2e/smoke.spec.ts` home tests first: replace the `3 videos` assertion with a newest-first href order check (`/v/tour-world3d/`, `/v/paper-overview/`, `/v/intro-dark/`); delete "theme filter narrows and restores"; replace "unknown theme behaves as all" with "`/?theme=paper` shows all 3 cards"; change the home `<h1>` name to `Góc Nhìn Mở`; delete card theme-label assertions in "broken poster keeps text visible" and anywhere else on cards. Run and confirm the new assertions fail.
2. Implement the theme tokens, layout `lang`/`dark`/`viewport`, and the logo asset.
3. Implement the sorted home page, server grid, and restyled card.
**Acceptance Criteria:**
- `out/index.html` from `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` contains `lang="vi"`, the class `dark` on `<html>`, `/brand/c1-lockup-white.webp`, and the three card links in newest-first order.
- No `ToggleGroup`, `Badge`, `useSearchParams`, or `Suspense` import remains in `app/page.tsx`, `components/video-grid.tsx`, or `components/video-card.tsx`.
- `components/video-grid.tsx` has no `"use client"` directive.
- `app/globals.css` has no `.dark {` block and no light token values.
**Reviewer Checklist:**
- Focus outline and ring are solid amber, not alpha-blended.
- Hover preview effects and media-query guards in `video-card.tsx` are byte-identical in behavior to base.
- The sort does not mutate the array returned by `getVideos`.
- Title clamp does not clip Vietnamese diacritics such as `Ở` and `ạ`.
- No file outside the Files list changed.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

### Phase 2: Side-by-side video page, cleanup, and README

**Phase Request:** Rebuild `app/v/[slug]/page.tsx` per `DESIGN.md` section "Video page": container `max-w-5xl`; from `md`, two columns with the player left and details right; stacked below `md`; player width capped at `calc((100svh - 8rem) * 9 / 16)`. Right column: back link `← Tất cả video`, `<h1>` title, meta line `<date> · <duration>` with `toLocaleDateString("vi-VN", { dateStyle: "long", timeZone: "UTC" })`, section heading `Lời thoại` with the transcript. Footer note in small muted text with `Người tạo`, `Giọng đọc`, `Quay màn hình: có | không`, and `Ghi chú` when notes exist; keep the creator link behavior. `VOICE_LABELS` become `Tự thu âm`, `TTS API`, `VieNeu-TTS`. Keep JSON-LD and `generateMetadata` unchanged. In `components/video-player.tsx`, remove `ThemeBadge`, use a black background, and change the fallback text to `Không phát được video`. Delete `components/theme-filter.tsx`, `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx`, and `components/ui/badge.tsx`. Update `README.md` per `DESIGN.md` section "Migration".
**Goal:** The video page renders side-by-side and Vietnamese, the orphaned filter and badge files are gone, the README matches, and every check passes.
**Depends on:** Phase 1
**Invariants & Boundaries:** Do not touch `lib/`, `app/sitemap.ts`, `app/robots.ts`, `scripts/`, `content/`, `docs/plans/`, `package.json`, `pnpm-lock.yaml`. JSON-LD and metadata output must stay identical for the same manifest. Keep the post-mount `videoRef.current?.error` check in `video-player.tsx`.
**Files:**
- Modify: `app/v/[slug]/page.tsx`
- Modify: `components/video-player.tsx`
- Modify: `e2e/smoke.spec.ts`
- Modify: `README.md`
- Delete: `components/theme-filter.tsx`
- Delete: `components/ui/toggle.tsx`
- Delete: `components/ui/toggle-group.tsx`
- Delete: `components/ui/badge.tsx`
**Tasks:**
1. Update `e2e/smoke.spec.ts` video page tests first: transcript heading `Lời thoại`; fallback text `Không phát được video` and the test title to match; remove theme-label assertions on the video page; remove `theme` from the `FixtureVideo` type. Run and confirm the new assertions fail.
2. Implement the video page layout, Vietnamese labels and date, footer note, and player changes.
3. Delete the four orphaned component files and confirm no import of them remains.
4. Update `README.md` line 3 (drop theme filtering), "Add a video" step 2 (recommend poster time `0` because frame 0 has no caption), and the empty-state sentence (`Chưa có video nào.`).
**Acceptance Criteria:**
- `out/v/intro-dark/index.html` from `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` contains `Lời thoại`, `Tất cả video`, `tháng 11, 2026`, and a `application/ld+json` script.
- `grep -rnE "theme-filter|toggle-group|ui/toggle|ui/badge|ThemeBadge|THEME_FILTERS" app components e2e` prints nothing.
- `README.md` contains no `filtered by theme` and no `No videos yet`.
**Reviewer Checklist:**
- JSON-LD fields and `generateMetadata` output are unchanged against base for the same fixture.
- The player stays fully visible at 1280x720 and the layout stacks at 390px.
- The fallback still renders `role="status"` and covers pre-hydration errors.
- Date formatting runs only in the server component.
- No file outside the Files list changed.
**Verification Checks:**
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

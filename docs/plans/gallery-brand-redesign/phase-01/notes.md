<!-- refract-shared-version: 3.0.8 -->

# Phase 1 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Replaced the `3 videos` count assertion with an href order assertion using `links.evaluateAll`, after the existing `toHaveCount(3)` check.
- Renamed "unknown theme behaves as all" to "old theme query shows all cards" and pointed it at `/?theme=paper`, as the prompt specifies.
- Removed `THEME_LABELS` and its label assertion, and kept the `theme` field in `FixtureVideo`.

### Spec deviations
- none

### Tradeoffs accepted
- The removal-only edits (filter test deletion, count assertion removal, `THEME_LABELS` removal) have no independent RED. They only remove assertions. Their behavior is covered by the RED of the other edits and by the GREEN run in Task 3.

### Assumptions
- The e2e `webServer` runs `pnpm build` with `VIDEOS_MANIFEST=tests/fixtures/videos.json` before the tests, so the RED run tests the unchanged app.

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test:e2e` (log `/tmp/sfg-p1-task1-red.log`) -> `3 failed, 6 passed` (exit 1). Behavioral failures:
    - `grid shows three cards`: `toEqual` mismatch. Received `["/v/intro-dark/", "/v/paper-overview/", "/v/tour-world3d/"]`, expected `["/v/tour-world3d/", "/v/paper-overview/", "/v/intro-dark/"]`.
    - `old theme query shows all cards`: `toHaveCount(3)` received 1 for `/?theme=paper`.
    - `hover preview mounts and unmounts`: `locator.hover` timed out after 30000 ms waiting for `getByRole('heading', { name: 'Góc Nhìn Mở', level: 1 })`.
  - GREEN: deferred. The GREEN run for Task 1 is the full `pnpm test:e2e` run recorded in the Task 3 block, after the app changes in Tasks 2 and 3.
- Root cause (bugfix only): none

## Task 2

### Decisions made
- `:root` holds the single navy token set. `.dark` is deleted, and `@custom-variant dark` is kept.
- Hex tokens are lowercased by the repo formatter (`biome check --write`). The colors are the same as `#16264A`, `#1F3360`, `#FEAB24`, and `#B8C2D9`.
- Chart tokens use amber and navy-tuned blue-grey tints. The prompt did not fix their values.
- Sidebar tokens: `--sidebar` and `--card` surface `#1F3360`, `--sidebar-accent` `#2A4274`, `--sidebar-primary` and `--sidebar-ring` amber, `--sidebar-primary-foreground` navy.
- `--destructive` keeps the former dark value `oklch(0.704 0.191 22.216)`, which reads on navy. `--radius` is unchanged.
- Base outline is `outline-ring` (solid amber). The `/50` alpha is removed.
- `app/layout.tsx` types the export as `Viewport` from `next`. The shape (`colorScheme`, `themeColor`) is confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`, section "colorScheme" and "themeColor".
- The `<html>` tag is split across lines by the formatter because the attribute line is longer than the line width.
- Logo file copied to `public/brand/c1-lockup-white.webp`. `cmp` against the source reports identical bytes.

### Spec deviations
- none

### Tradeoffs accepted
- The RED check is a build-output assertion, not a behavioral unit or e2e test. No existing test covers `lang`, the `dark` class, or the viewport meta. The Done When greps are the only check for these.

### Assumptions
- `theme-filter.tsx` and `components/ui/badge.tsx` stay in place. `components/video-player.tsx` still imports both (verified by grep), and the prompt keeps them until Phase 2.

### Follow-ups for human
- Vietnamese UI copy and token names need no further action in this phase. Native-speaker review of Vietnamese copy is still open per DESIGN.md "Risks and Open Questions".

### Test evidence
- RED -> GREEN:
  - RED: `grep -c -F '<html lang="vi"' out/index.html` -> `0`, and `grep -c -F '/brand/c1-lockup-white.webp' out/index.html` -> `0`, against the `out/` build produced by the Task 1 RED run from the unchanged app. The bare pattern `lang="vi"` matched once on the `intro-dark` card `<h2>`, so the check targets the `<html` tag. Assertion failure, not a tooling error.
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit `0`. The built HTML has `<html lang="vi" class="qCbBtW_variable dark h-full antialiased">`, `<meta name="color-scheme" content="dark"/>`, and `<meta name="theme-color" content="#16264A"/>`. The logo marker is not expected at this step and is verified in Task 3.
  - GREEN: `pnpm exec biome check app/globals.css app/layout.tsx` -> `Checked 2 files`, no errors, after `biome check --write` lowercased the hex values.
- Root cause (bugfix only): none

## Task 3

### Decisions made
- The logo suppression comment is `{/* biome-ignore lint/performance/noImgElement: ... */}` inside `<h1>`. A `//` comment is not a valid JSX child, so the `video-card.tsx` pattern does not carry over directly. Biome accepts the form (lint pass, 31 files).
- The card focus ring changes from `focus-visible:ring-ring/50` to `focus-visible:ring-ring`. The prompt asks both to keep focus lines unchanged and to avoid `/50`. The explicit `/50` rule was applied, and every other focus and media-query line is unchanged.
- Duration pill: `absolute right-2 bottom-2` with the prompt's classes. The 0.5rem offset is my choice because the prompt did not give one. The pill follows the preview `<video>` in the DOM, so it paints above the preview.
- Title: `mt-3 line-clamp-2 text-sm leading-normal font-medium`. `leading-snug` is replaced by `leading-normal`.
- Logo: `h-8 w-auto sm:h-12`. The `sm:h-12` value is my choice for "larger from sm".
- Grid: `mt-6` is kept on the `<ul>` to replace the former section spacing. Breakpoints are `grid-cols-2 md:grid-cols-3 xl:grid-cols-4` and `gap-3 sm:gap-6`.
- Sort: `getVideos().toSorted(...)` in the page. `tsconfig.json` has `lib: esnext`, so the method type-checks. Ties keep manifest order because `toSorted` is stable.
- Biome reflowed one line of the e2e hover assertion (formatting only, from Task 1).

### Spec deviations
- none

### Tradeoffs accepted
- Vietnamese copy (`Chưa có video nào.`) is drafted and is not yet reviewed by a native speaker.

### Assumptions
- The sort compares `publishedAt` as ISO dates with `localeCompare`. `lib/videos.ts` validates `publishedAt` with `z.iso.date()`, so the format is fixed.

### Follow-ups for human
- Logo dimensions differ from the file header. The VP8X chunk of `public/brand/c1-lockup-white.webp` stores width-1 = `0x000383` = 899 and height-1 = `200`, so the canvas is 900x201. The prompt and DESIGN.md specify `width={899} height={200}`, and this phase uses those values. The difference is sub-pixel at the rendered heights. Confirm which values to keep.
- Screenshots at 390px and 1280px are a DESIGN.md success criterion. They are not in this phase's Done When and were not captured.
- Native-speaker review of the Vietnamese UI copy in `app/page.tsx` and the card markup is still open.

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test:e2e` (log `/tmp/sfg-p1-task3-red.log`) -> `3 failed, 6 passed`, exit `1`, run after Task 2. Failures:
    - `grid shows three cards`: `toEqual` mismatch. Received `["/v/intro-dark/", "/v/paper-overview/", "/v/tour-world3d/"]`.
    - `old theme query shows all cards`: `toHaveCount(3)` received `1`.
    - `hover preview mounts and unmounts`: `locator.hover` timed out after 30000 ms waiting for `getByRole('heading', { name: 'Góc Nhìn Mở', level: 1 })`.
  - GREEN: `pnpm test:e2e` (log `/tmp/sfg-p1-e2e.log`) -> `9 passed`, exit `0`. This is also the Task 1 GREEN, because the Task 1 RED tests are in this run.
  - GREEN: `pnpm lint` (log `/tmp/sfg-p1-lint.log`) -> `Checked 31 files`, exit `0`. The first lint run found one formatting error in `e2e/smoke.spec.ts`. `biome check --write` fixed it.
  - GREEN: `pnpm test` (log `/tmp/sfg-p1-unit.log`) -> `Tests 31 passed (31)`, exit `0`.
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` (log `/tmp/sfg-p1-build.log`) -> exit `0`.
- Root cause (bugfix only): none

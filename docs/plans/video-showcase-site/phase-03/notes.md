<!-- refract-shared-version: 3.0.8 -->

# Phase 3 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Added `toggle-group`, `toggle`, and `badge` with `pnpm dlx --ignore-workspace shadcn@latest add toggle-group toggle badge --yes`. The CLI left `package.json` and `pnpm-lock.yaml` unchanged.
- Ran `pnpm exec biome check --write components/ui` on the three generated files. The shadcn output (no semicolons, unsorted imports, `import { type ... }`) failed the repo Biome config. The formatting change is the only edit to them.
- `--font-mono` value replaced with `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. No other line changed.

### Spec deviations
- none

### Tradeoffs accepted
- Task 1 adds components, not behavior, so the RED for Task 1 is the `--font-mono` assertion in built CSS. The component files are checked by lint and build only.

### Assumptions
- The shadcn CLI registry output for `base-nova` matches the ctx7 docs for `shadcn add` (`npx shadcn@latest add toggle-group`, `add badge`).

### Follow-ups for human
- A future `shadcn add` run rewrites `components/ui/*` in the shadcn style. Biome must be run on those files again.

### Test evidence
- RED -> GREEN:
  - RED: `pnpm build && grep -o -- '--font-mono:[^;}]*' out/_next/static/chunks/*.css` -> `--font-mono:var(--font-geist-mono)` (undefined variable in built CSS; check fails)
  - GREEN: `pnpm build && grep -o -- '--font-mono:[^;}]*' out/_next/static/chunks/*.css` -> `--font-mono:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; build exit 0
  - GREEN (lint, before Biome format of `components/ui`): `pnpm lint` -> exit 1; diagnostics in `components/ui/toggle-group.tsx` (`useImportType`, `organizeImports`) and `components/ui/badge.tsx` (`format`)
  - GREEN (lint, after `pnpm exec biome check --write components/ui`): `pnpm lint` -> exit 0, `Checked 20 files ... No fixes applied.`
- Root cause (bugfix only): none

## Task 2

### Decisions made
- `parseTheme(raw: string | null): ThemeFilterValue` lives in `components/video-grid.tsx`. It returns the matched filter value, or `all` for unknown, empty, or missing input. Matching is case-sensitive.
- `THEME_FILTERS` and `ThemeFilter` live in `components/theme-filter.tsx`. This keeps the grid to one import direction, with no cycle.
- Filter state is held in the URL. `selectTheme` builds the query from `useSearchParams`, deletes `theme` for `all`, and calls `router.replace(..., { scroll: false })`. No history entry is added.
- The `ToggleGroup` is controlled with `value={[value]}`. Pressing the already-pressed item makes Base UI emit `[]`. The handler ignores an empty result so exactly one item stays pressed.
- `app/page.tsx` renders the "No videos yet." paragraph on the server when the manifest is empty. The filter and Suspense are skipped in that case.
- The Suspense fallback is `VideoGridFallback`, which renders the unfiltered card list. The static HTML contains every card link.
- The count live region is `<p aria-live="polite">`. It reads `N videos`, or `N videos in <Label>` when a filter is active.
- Empty-filter state: `No videos match this theme.` plus a plain `Show all` button. Adding a shadcn `button` component was not needed.
- Grid columns: 1 below 480px, 2 from `min-[480px]`, 3 from `min-[769px]`, 4 from `xl` (1280px). This matches "2 columns up to 768px".
- Task 2 added an inert `VideoCard` scaffold (a `Link` with the title). Task 3 replaced it.

### Spec deviations
- none

### Tradeoffs accepted
- The Suspense fallback renders the cards without the filter controls, because the controls need `useSearchParams`. The spec requires only the unfiltered grid in the fallback.
- `router.replace` after a click runs asynchronously. The `aria-pressed` state follows the URL, so a click is visible after navigation completes.

### Assumptions
- Base UI `ToggleGroup` with `multiple` unset (`false`) replaces the pressed item when another item is clicked. This follows the Base UI docs (ctx7 `/websites/base-ui_react`). Not browser-tested.

### Follow-ups for human
- Browser check: arrow keys, Tab, Space, and Enter on the filter, and the URL update without a scroll jump.

### Test evidence
- RED -> GREEN:
  - RED: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3 && ! grep -q "<video" out/index.html` -> build exit 0; count `0`; check exit 1 (assertion `-eq 3` fails, no grid yet)
  - RED: `pnpm build && grep -q "No videos yet" out/index.html` -> exit 1 (empty state absent)
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3 && ! grep -q "<video" out/index.html` -> build exit 0; distinct links `3` (`/v/intro-dark/`, `/v/paper-overview/`, `/v/tour-world3d/`); `<video` count `0`; check exit 0
  - GREEN: `pnpm build && grep -q "No videos yet" out/index.html` -> build exit 0; output line `No videos yet.`; check exit 0
  - GREEN (lint): `pnpm lint` -> exit 0, `Checked 23 files in 10ms. No fixes applied.`
  - Scratch behavior check (outside the repo, `/tmp/checks`, vitest with alias `@/` to the repo): `pnpm exec vitest run --config /tmp/checks/vitest.config.mjs` -> `Tests 3 passed (3)`. Covers `parseTheme` (`null`, `""`, `bogus`, `DARK`, `all` -> `all`; `dark`, `paper`, `world3d` unchanged), and `ThemeFilter` server markup with exactly one `aria-pressed="true"` and three `aria-pressed="false"`.
- Root cause (bugfix only): none

## Task 3

### Decisions made
- Poster is a native `<img loading="lazy" decoding="async" alt={title}>` inside an `aspect-[9/16]` box with `bg-muted`. `onError` sets `posterFailed`, which removes the `<img>`. The placeholder, title, badge, and duration remain.
- The preview `<video>` mounts only when `engaged && previewAllowed`. `engaged` is set by pointer enter and focus on the Link, and cleared by pointer leave and blur. `previewAllowed` is set in an effect from `matchMedia("(hover: none)")` and `matchMedia("(prefers-reduced-motion: reduce)")`, with change listeners. It starts `false`, so SSR HTML has no `<video>`.
- Playback: `videoRef.current?.play().catch(() => undefined)` in an effect keyed on `showPreview`. The rejection is swallowed.
- Duration: `Math.round(durationSec)`, then `m:ss`. For example `65.5` renders as `1:06`.
- Theme badge reuses the `THEME_FILTERS` label (`Dark`, `Paper`, `World 3D`).
- Motion: `motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5` only. Hover on Tailwind v4 is limited to hover-capable devices. No `transition: all`.
- Biome `noImgElement` warning on the poster `<img>` is suppressed with a `biome-ignore` comment. The spec requires a native `img` with `loading="lazy"` on a static export that uses `images.unoptimized`.

### Spec deviations
- none

### Tradeoffs accepted
- The poster `<img>` is native, not `next/image`. The lint warning is suppressed, not fixed.
- `onError` and the hover and focus preview are not exercised in a browser. The checks below are build output and SSR markup only.

### Assumptions
- `loading="lazy"` on the poster is enough for the spec's lazy requirement. No preloading is added.

### Follow-ups for human
- Browser check (Playwright is out of scope for this phase): hover and keyboard-focus preview mount and unmount, no `<video>` on `(hover: none)` or reduced-motion, and the poster fallback when `posterUrl` fails.

### Test evidence
- RED -> GREEN:
  - RED: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'loading="lazy"' out/index.html | wc -l)" -eq 3 && grep -q 'aspect-\[9/16\]' out/index.html` -> build exit 0; `loading="lazy"` count `0`; check exit 1 (scaffold has no poster)
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'loading="lazy"' out/index.html | wc -l)" -eq 3 && grep -q 'aspect-\[9/16\]' out/index.html` -> build exit 0; `loading="lazy"` count `3`; durations in HTML `0:42`, `1:06`, `0:30`; `lang="en"` count `2` (`<html>` and `paper-overview`), `lang="vi"` count `2` (`intro-dark`, `tour-world3d`); check exit 0
  - GREEN (lint, with the `<img>` warning): `pnpm lint` -> exit 0, one `lint/performance/noImgElement` warning
  - GREEN (lint, after the `biome-ignore` comment): `pnpm lint` -> exit 0, `Checked 23 files in 9ms. No fixes applied.`
  - Scratch behavior check (run after Task 3): `pnpm exec vitest run --config /tmp/checks/vitest.config.mjs` -> `Tests 3 passed (3)`. `VideoCard` server markup has `loading="lazy"`, `decoding="async"`, `alt`, `lang="vi"`, `0:42`, badge `Dark`, `aspect-[9/16]`, and no `<video`. The first run failed on the href assertion because the test harness does not apply `trailingSlash: true`. The built HTML has `href="/v/intro-dark/"`, and the assertion was changed to match both.
- Root cause (bugfix only): none

## Final verification (Done When, run from `/home/ngosi/projects/scene-flow-gallery`)
- `pnpm lint` -> exit 0, `Checked 23 files in 9ms. No fixes applied.`
- `pnpm test` -> exit 0, `Tests 29 passed (29)`
- `pnpm build` -> exit 0 (default manifest `[]`)
- `pnpm build && grep -q "No videos yet" out/index.html && ! grep -q "<video" out/index.html` -> exit 0
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3 && ! grep -q "<video" out/index.html` -> exit 0, distinct links `3`
- Final `pnpm build` (empty manifest) -> exit 0; `out/index.html` contains `No videos yet.`, 0 `/v/` links, 0 `<video` (the `/v/` count is 0 in the final build)

## Fix 1 (review findings, `components/video-card.tsx` only)

### Decisions made
- Hover and focus are tracked in separate state: `hovered` (pointer enter and leave) and `focused` (focus and blur). `showPreview = (hovered || focused) && previewAllowed`. Leaving one state no longer clears the other.
- `previewAllowed` gating, the `(hover: none)` and `prefers-reduced-motion` guards, and the `<video muted loop playsInline preload="none">` attributes are unchanged.
- Poster `<img>` uses `alt=""`. The title `<h2 lang={video.lang}>` remains the accessible name for the card link.

### Spec deviations
- none

### Tradeoffs accepted
- The `biome-ignore` comment and the other lines of the card are unchanged.
- The scratch check runs under jsdom, not a real browser. Real pointer and focus behavior, and the `(hover: none)` device case, are still not exercised in a browser (see Follow-ups).

### Assumptions
- jsdom 26.1.0 dispatches React `onPointerEnter` and `onPointerLeave` from `pointerover` and `pointerout` events with `relatedTarget: null`, and `onFocus` and `onBlur` from `focus()` and `blur()`. The RED result below confirms the bug is reproduced through these events.

### Follow-ups for human
- Browser check (unchanged from Task 3): keyboard focus and pointer hover together, pointer leave while focused, and the `(hover: none)` and reduced-motion cases in a real browser.

### Test evidence
- Scratch harness, outside the repo: `/tmp/checks/preview.test.mjs` (7 tests, jsdom 26.1.0 installed in `/tmp/checks`, not the repo). `/tmp/checks/phase3.test.mjs` is the existing SSR check, updated for the `alt` change. Run: `cd /tmp/checks && /home/ngosi/projects/scene-flow-gallery/node_modules/.bin/vitest run --config /tmp/checks/vitest.config.mjs`.
- Harness setup note: the first scratch run failed with `ReferenceError: self is not defined` from `next/link`. That was a harness error. The harness now sets `self` and `requestIdleCallback`. It is not counted as RED.
- RED (old state logic, before the fix): `Tests 3 failed | 4 passed (7)`.
  - FAIL `keeps the preview when the pointer leaves while the card is keyboard-focused` (`expected null not to be null`)
  - FAIL `keeps the preview when focus leaves while the pointer is still over the card` (`expected null not to be null`)
  - FAIL `poster is decorative (alt="") and the title keeps its lang` (`expected 'Giới thiệu dịch vụ' to be ''`)
  - PASS (both states): hover mounts with the video attributes and `play()` called; unmount when neither is active; no mount on `(hover: none)`; no mount under reduced motion. These are guards and existing behavior, so they pass on both versions.
- GREEN (after the fix): `cd /tmp/checks && ... vitest run --config /tmp/checks/vitest.config.mjs` -> `Test Files 2 passed (2)`, `Tests 10 passed (10)`.
- The `phase3.test.mjs` assertion `alt="Giới thiệu dịch vụ"` was changed to `alt=""` in `/tmp/checks`. The old value encoded the behavior this fix removes.
- Fresh checks, run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` -> exit 0, `Checked 23 files in 9ms. No fixes applied.`
  - `pnpm test` -> exit 0, `Tests 29 passed (29)`
  - `pnpm build` (default manifest) -> exit 0
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && test "$(grep -o 'href="/v/[a-z0-9-]*/"' out/index.html | sort -u | wc -l)" -eq 3 && ! grep -q "<video" out/index.html` -> exit 0; distinct links `3`; `<video` count `0`; `alt=""` count `3`
  - Final `pnpm build` (empty manifest) -> exit 0; `No videos yet` present; `<video` count `0`; `/v/` link count `0`
- Root cause (bugfix only): one `engaged` boolean was written by both pointer and focus handlers. A leave or blur event from one input cleared the state set by the other. Poster alt used the title outside the heading's `lang`, so it was read in the document language and announced twice.

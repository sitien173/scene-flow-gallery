<!-- refract-shared-version: 3.0.8 -->

# Phase 2 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- The `Tất cả video` back-link assertion goes inside the existing `card opens the video page` test, not a new test. The link name is matched with `getByRole("link", { name: "Tất cả video" })`. Playwright name matching is substring by default, so the `← ` arrow in the rendered text does not block the match.
- `Lời thoại` is asserted with `exact: true`, matching the existing `Transcript` assertion.
- `e2e/smoke.spec.ts` had no theme-label assertions on the video page, so nothing was removed for that part of the task.

### Spec deviations
- none

### Tradeoffs accepted
- The back-link assertion runs before the `Lời thoại` heading assertion in the same test. The RED run stops at the first failure, so the heading assertion did not run during RED. Its behavior is confirmed in the GREEN run.

### Assumptions
- none

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test:e2e` (log: `/tmp/sfg-p2-task1-red.log`) -> `2 failed, 7 passed`.
    - `card opens the video page`: `expect(locator).toBeVisible() failed`, `Locator: getByRole('link', { name: 'Tất cả video' })`, `Expected: visible`, `element(s) not found`.
    - `broken video shows Không phát được video`: `expect(locator).toBeVisible() failed`, `Locator: getByText('Không phát được video', { exact: true })`, `Expected: visible`, `element(s) not found`.
    - The seven other tests passed. Phase base was 9 passed; the two changed tests are the failures.
  - GREEN: `pnpm test:e2e` after Task 2 (log: `/tmp/sfg-p2-task2-green.log`) -> `9 passed (22.7s)`.
- Root cause (bugfix only): none

## Task 2

### Decisions made
- The width cap is applied to a wrapper `div` around `VideoPlayer` with `md:w-[calc((100svh-8rem)*9/16)]`. `VideoPlayer` takes no `className`, so the wrapper carries the cap. The container uses `md:grid md:grid-cols-[auto_1fr] md:items-start md:gap-8`. The fixed-width left column makes the `auto` track resolve to the cap.
- The `max-w-sm` class already on `VideoPlayer` is kept. It still caps the player at 24rem on tall viewports.
- The date uses `toLocaleDateString("vi-VN", { dateStyle: "long", timeZone: "UTC" })` in the server component. The `<time>` element keeps `dateTime={video.publishedAt}`.
- The meta line is a `<p>` with `<time>`, then `{" · "}`, then the duration. The spec asks for `<date> · <duration>`, so the order changed from the original duration-first layout.
- The footer block uses `Người tạo`, `Giọng đọc`, `Quay màn hình: có | không`, and `Ghi chú` when notes exist. The creator link keeps the `httpUrl` check and `target`/`rel` attributes.
- `VOICE_LABELS` changes only the `self-recorded` value to `Tự thu âm`. Keys and key order are unchanged.
- `generateMetadata` and the JSON-LD script are unchanged.
- In `components/video-player.tsx`, `ThemeBadge`, the `THEME_FILTERS` and `Badge` imports, and the `Video` type import are removed. The `Video` import had no other use. The background is `bg-black`. The fallback text is `Không phát được video`. The post-mount `videoRef.current?.error` check and `role="status"` are kept.

### Spec deviations
- none

### Tradeoffs accepted
- The player width cap applies only from `md` up. Below `md` the player is `w-full` capped at `max-w-sm`, as the spec requires.
- The 1280x720 "whole player visible" requirement was not verified visually. See Follow-ups.

### Assumptions
- The `8rem` offset in the cap formula, as given in the prompt, accounts for the Phase 1 header and page padding. I did not measure the rendered header height.

### Follow-ups for human
- Visual check not performed: DESIGN.md `Testing` asks for screenshots at 390px and 1280px with the preview manifest. This needs a browser attach; the e2e suite does not cover layout. The `8rem` value should be confirmed on that screenshot.

### Test evidence
- RED -> GREEN:
  - RED: reused from Task 1 (`/tmp/sfg-p2-task1-red.log`) -> `2 failed, 7 passed`. The Task 2 page and player changes address the two failing assertions: the `Tất cả video` link and the `Không phát được video` text. The spec file is shared, so no separate RED run exists for Task 2.
  - GREEN: `pnpm test:e2e` (log: `/tmp/sfg-p2-task2-green.log`) -> `9 passed (22.7s)`.
  - Biome: `pnpm exec biome check` on `app/v/[slug]/page.tsx`, `components/video-player.tsx`, and `e2e/smoke.spec.ts` first reported one formatting issue, a notes line in `page.tsx`. The line was collapsed to Biome's form. Re-run -> `Checked 3 files in 15ms. No fixes applied.`, exit 0.
- Root cause (bugfix only): none

## Task 3

### Decisions made
- The four orphaned files were deleted with `rm`: `components/theme-filter.tsx`, `components/ui/toggle.tsx`, `components/ui/toggle-group.tsx`, `components/ui/badge.tsx`.
- `components/ui/` is now an empty directory. It is outside the declared file set, and git does not track empty directories, so it was left in place.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- none

### Follow-ups for human
- `components/ui/` is an empty directory. Remove it in a later phase or with a shadcn config cleanup if no tool expects it. The shadcn configuration file was not checked.

### Test evidence
- RED -> GREEN:
  - RED: `grep -rnE "theme-filter|toggle-group|ui/toggle|ui/badge|ThemeBadge|THEME_FILTERS" app components e2e` before deletion -> matches in `components/theme-filter.tsx` (lines 3, 5, 12, 27, 33) and `components/ui/toggle-group.tsx` (lines 4, 9, and others), exit 0.
  - GREEN: the same grep after deletion -> no output, exit 1.
- Root cause (bugfix only): none

## Task 4

### Decisions made
- `README.md:3`: the clause `, and the grid can be filtered by theme` is removed. The sentence now ends `Each video has its own page.`
- `README.md:44`: the step 2 intro now reads `Choose a poster time in seconds that is less than the video length. Use `0`, because frame 0 has no caption:`.
- `README.md:128`: `The home page shows `No videos yet`.` becomes `The home page shows `Chưa có video nào.`.`
- `scripts/prepare-video.sh` accepts `0`: the regex `^[0-9]+(\.[0-9]+)?$` admits it, and `0 < duration` holds for any real video.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- The reason `frame 0 has no caption` comes from DESIGN.md `Migration`. I did not check it against the render pipeline.

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `grep -niE "filter|No videos|empty|poster time" README.md` before editing -> line 3 (`filtered by theme`), line 44 (poster time sentence), and line 128 (`No videos yet`).
  - GREEN: `grep -rnE "filtered by theme|No videos yet" README.md` after editing -> no output, exit 1.
- Root cause (bugfix only): none

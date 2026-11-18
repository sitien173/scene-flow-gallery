<!-- refract-shared-version: 3.0.8 -->

# Phase 3 Journal: Gallery grid with theme filter

<!-- Created by the worker per worker-contract.md. Append every block; keep earlier sections. -->

## META

- Plan: docs/plans/video-showcase-site/PLAN.md
- Implementation Profile: anthropic (google target agy-gemini-hydrogen-high failed target_fatal in 572 ms, job b285dad0, no file changes, no fallback target)
- Consultation Profile: n/a
- Review Profile: openai
- Implementation Job: 6b0f55bd-0693-405b-96ce-b31d750f37ed
- Review Job: 21ec962a-5c3c-40f0-8401-291fd35f6ed5
- Started: 2026-11-18T12:17:23+07:00
- Finished: 2026-11-18T12:36:56+07:00

## Implementation Response

<!-- Worker appends each full `# EXTERNAL RESPONSE` block here without overwriting prior blocks. -->

# EXTERNAL RESPONSE
## META
- Phase: 3 (Gallery grid with theme filter)
- Started: 2026-11-18T12:17:23+07:00
- Finished: 2026-11-18T12:36:56+07:00
- Plan dir: docs/plans/video-showcase-site
## SUMMARY
Phase 3 delivered the `/` page: a Zod-validated manifest feeds a static, theme-filtered grid of 9:16 video cards with URL-based filter state, a polite live count, both empty states, a poster fallback, and a hover and focus preview guarded by `(hover: none)` and reduced motion.
## FILES MODIFIED
| Action | Path | Change |
| --- | --- | --- |
| Modify | app/globals.css | `--font-mono` value replaced with `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; no other line changed |
| Modify | app/page.tsx | Server component: calls `getVideos()`, renders heading, "No videos yet." for an empty manifest, otherwise `Suspense` with `VideoGridFallback` and `VideoGrid` |
| Create | components/ui/toggle-group.tsx | Added by shadcn CLI, then formatted with Biome |
| Create | components/ui/toggle.tsx | Added by shadcn CLI, then formatted with Biome |
| Create | components/ui/badge.tsx | Added by shadcn CLI, then formatted with Biome |
| Create | components/theme-filter.tsx | Client: `THEME_FILTERS`, `ThemeFilter` toggle group (`aria-pressed` from Base UI) |
| Create | components/video-grid.tsx | Client: `parseTheme`, `VideoGrid` (URL state, live count, empty states), `VideoGridFallback` |
| Create | components/video-card.tsx | Client: link card, poster fallback, theme badge, `m:ss` duration, hover and focus preview |
| Modify | docs/plans/video-showcase-site/phase-03/notes.md | Replaced the template block with `## Task 1`, `## Task 2`, `## Task 3`, and the final verification block |
| Modify | docs/plans/video-showcase-site/phase-03/journal.md | META Finished, and this response block |

Not modified: `package.json`, `pnpm-lock.yaml`, `app/layout.tsx`, `lib/videos.ts`, `content/`, `tests/`, `.handover.md`, `PLAN.md`, `DESIGN.md`, `prompt.md`.
## NOTES
- phase-03/notes.md  (## Task 1, ## Task 2, ## Task 3, ## Final verification)
- Fresh checks: `pnpm lint` exit 0; `pnpm test` exit 0 (29 passed); `pnpm build` exit 0; empty-manifest grep check exit 0; fixture check exit 0 (3 distinct `/v/<slug>/` links, 0 `<video`); final empty-manifest build exit 0.
- Scratch behavior checks outside the repo (`/tmp/checks`): 3 passed (`parseTheme` fallback, `aria-pressed` markup, card SSR markup).
## SPEC COMPLIANCE
- Meets Spec? WITH_DEBT: every Done When check passes; browser-only behavior (hover and focus preview, poster `onError`, keyboard operation, URL update without scroll jump) is implemented but not exercised in a browser.
## CLARIFICATIONS NEEDED
None
## NEXT
TASK_COMPLETE

# EXTERNAL RESPONSE
## META
- Phase: 3 (Gallery grid with theme filter), fix batch 1 (review findings)
- Started: not recorded; the fix batch began after the prior Finished time, 2026-11-18T12:36:56+07:00
- Finished: 2026-11-18T12:44:10+07:00
- Plan dir: docs/plans/video-showcase-site
## SUMMARY
The fix batch separates pointer hover and keyboard focus in the video card, so one input no longer clears the preview set by the other, and makes the poster alt decorative (`alt=""`) so the title is announced once, in its own `lang`.
## FILES MODIFIED
| Action | Path | Change |
| --- | --- | --- |
| Modify | components/video-card.tsx | `engaged` split into `hovered` and `focused`; `showPreview = (hovered \|\| focused) && previewAllowed`; poster `alt` changed to `""`. No other line changed. |
| Modify | docs/plans/video-showcase-site/phase-03/notes.md | Appended `## Fix 1` block |
| Modify | docs/plans/video-showcase-site/phase-03/journal.md | Appended this fix response block under `## Implementation Response` |

Scratch files outside the repo, not modified in the repo: `/tmp/checks/preview.test.mjs` (new), `/tmp/checks/phase3.test.mjs` (one assertion changed to `alt=""`), `/tmp/checks/node_modules` (jsdom 26.1.0).

Not modified: `package.json`, `pnpm-lock.yaml`, `app/`, `lib/videos.ts`, `content/`, `tests/`, `.handover.md`, `PLAN.md`, `DESIGN.md`, `prompt.md`. No commit made.
## NOTES
- phase-03/notes.md  (## Fix 1)
- Scratch checks (outside the repo, `/tmp/checks`): RED `Tests 3 failed | 4 passed (7)` on the old state logic and alt; GREEN `Tests 10 passed (10)` across both files.
- Fresh checks: `pnpm lint` exit 0 (23 files); `pnpm test` exit 0 (29 passed); `pnpm build` exit 0; fixture check exit 0 (3 distinct `/v/<slug>/` links, 0 `<video`, 3 `alt=""`); final empty-manifest build exit 0 (`No videos yet` present, 0 `<video`).
## SPEC COMPLIANCE
- Meets Spec? WITH_DEBT: both blocking review findings are fixed and verified by a jsdom scratch check and the Done When commands. Real-browser hover, focus, `(hover: none)`, reduced-motion, and poster `onError` checks are still not run; they are carried in `notes.md` under Fix 1 and Task 3 follow-ups.
## CLARIFICATIONS NEEDED
None
## NEXT
TASK_COMPLETE

## Quality Review

<!-- Coordinator appends the independent review response here. -->

## Review Result

- Spec Status: PENDING
- Quality Status: PENDING
- Debt: none

## Final Checkpoint

- Phase base ref: refs/plans/video-showcase-site/phase-03/base
- Phase implementation ref: refs/plans/video-showcase-site/phase-03/impl
- Plan commit ref: refs/plans/video-showcase-site/impl or `pending`
- State checkpoint: temporary commit, or `n/a (untracked)` when plan artifacts
  are excluded

Phase refs retain review evidence after checkpoint consolidation. The plan ref
names the sole commit retained on the branch.

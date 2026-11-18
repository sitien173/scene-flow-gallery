<!-- refract-shared-version: 3.0.8 -->

# Phase 5 Journal: End-to-end smoke test and CI

<!-- Created by the worker per worker-contract.md. Append every block; keep earlier sections. -->

## META

- Plan: docs/plans/video-showcase-site/PLAN.md
- Implementation Profile: default
- Consultation Profile: n/a
- Review Profile: default
- Implementation Job: n/a
- Review Job: n/a
- Started: 2026-11-18T13:46:11+07:00 (creation time of `phase-05/notes.md`; the first phase record write, not a recorded start)
- Finished: 2026-11-18T13:53:00+07:00

## Implementation Response

# EXTERNAL RESPONSE
## META
- Phase: 5 | Started: 2026-11-18T13:46:11+07:00 | Finished: 2026-11-18T13:53:00+07:00 | Plan dir: docs/plans/video-showcase-site
## SUMMARY
Added a Chromium-only Playwright smoke suite (10 passing tests, no skips), the `test:e2e` script, the Vitest exclude for `e2e/`, and a CI workflow that parses and pins Node 24 with the `packageManager` pnpm version.
## FILES MODIFIED
| Action | Path | Change |
|---|---|---|
| Modified | package.json | Added devDependencies `@playwright/test@1.65.1` and `serve@14.2.8`, the `test:e2e` script, and `engines.node` `>=20.18` |
| Modified | pnpm-lock.yaml | Lockfile update for the two new devDependencies |
| Modified | vitest.config.ts | Excludes `e2e/**` from test discovery, keeping the default excludes |
| Modified | .gitignore | Added `blob-report/` |
| Created | playwright.config.ts | Chromium project, `webServer` build and serve on 127.0.0.1:4173, CI reporters |
| Created | e2e/smoke.spec.ts | Smoke spec, tests 1 to 10 of the contract |
| Created | .github/workflows/ci.yml | Single `check` job: lint, test, build, e2e, failure artifact; `contents: read` |
| Created | docs/plans/video-showcase-site/phase-05/notes.md | `## Task 1`, `## Task 2`, `## Task 3`, `## Final checks` |
| Created | docs/plans/video-showcase-site/phase-05/journal.md | META and this response |
## NOTES
- phase-05/notes.md (## Task 1, ## Task 2, ## Task 3, ## Final checks)
- Fresh checks: `pnpm lint` exit 0; `pnpm test` exit 0, 31 tests, no `e2e` collected; `pnpm test:e2e` exit 0, 10 passed, 0 skipped; workflow YAML parse exit 0; `pnpm build` on the empty manifest exit 0, run last.
- Full e2e suite ran 3 times consecutively locally (10 passed each) and once in CI mode (10 passed). See `## Task 2`.
## SPEC COMPLIANCE
- Meets Spec? WITH_DEBT: All blocking criteria pass with behavioral RED to GREEN evidence. Debt: test 11 is not written (the fixture cannot reach the empty state), and the workflow has not run on GitHub.
## CLARIFICATIONS NEEDED
Non-blocking. The question does not change the status below.
- Should `components/video-grid.tsx` render the result count with `role="status"`? The plan's Prior State says it is a `role="status"` region. The code renders `<p aria-live="polite">` with no role. This is an out-of-scope app file, so it was not changed. The smoke test checks the visible text, so it passes either way.
## NEXT
TASK_COMPLETE

Phase 5 completed. Journal: docs/plans/video-showcase-site/phase-05/journal.md.

## Quality Review

<!-- Coordinator appends the independent review response here. -->

## Review Result

- Spec Status: PENDING
- Quality Status: PENDING
- Debt: none

## Final Checkpoint

- Phase base ref: refs/plans/video-showcase-site/phase-05/base
- Phase implementation ref: refs/plans/video-showcase-site/phase-05/impl
- Plan commit ref: refs/plans/video-showcase-site/impl or `pending`
- State checkpoint: `n/a (untracked)`

Phase refs retain review evidence after checkpoint consolidation. The plan ref
names the sole commit retained on the branch.

# EXTERNAL RESPONSE
## META
- Phase: 5 (FIX batch 1) | Started: 2026-11-18T14:01:12+07:00 (birth time of the first fix evidence log; not a recorded start) | Finished: 2026-11-18T14:08:52+07:00 | Plan dir: docs/plans/video-showcase-site
## SUMMARY
Set `reuseExistingServer: false` in `playwright.config.ts` so every local `pnpm test:e2e` builds the fixture export and serves it, and a busy port 4173 fails loudly. RED and GREEN evidence is in `notes.md`; lint, test, and the empty-manifest build pass.
## FILES MODIFIED
| Action | Path | Change |
|---|---|---|
| Modified | playwright.config.ts | `reuseExistingServer: !process.env.CI` changed to `reuseExistingServer: false`; no other setting changed |
| Modified | docs/plans/video-showcase-site/phase-05/notes.md | Appended `## Fix 1` block |
| Modified | docs/plans/video-showcase-site/phase-05/journal.md | Appended this fix response block |
## NOTES
- phase-05/notes.md (## Fix 1)
- Fresh checks: `pnpm lint` exit 0; `pnpm test` exit 0, 31 tests, no `e2e` collected; `pnpm build` on the empty manifest exit 0, run last. `pnpm test:e2e` GREEN exit 0, 10 passed, with port free; busy-port run exit 1 with the port-in-use error. See `## Fix 1`.
- Generated `out/`, `test-results/`, and `playwright-report/` were rewritten by the runs. All three are gitignored.
## SPEC COMPLIANCE
- Meets Spec? WITH_DEBT: The review finding is fixed with RED to GREEN evidence. The debt from the original response still stands: test 11 is not written, and the workflow has not run on GitHub.
## CLARIFICATIONS NEEDED
None
## NEXT
TASK_COMPLETE

Phase 5 completed. Journal: docs/plans/video-showcase-site/phase-05/journal.md.

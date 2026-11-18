<!-- refract-shared-version: 3.0.8 -->

# Phase 2 Journal: Validated video manifest

<!-- Created by the worker per worker-contract.md. Append every block; keep earlier sections. -->

## META

- Plan: docs/plans/video-showcase-site/PLAN.md
- Implementation Profile: anthropic
- Consultation Profile: n/a
- Review Profile: openai
- Implementation Job: 20022f23-6476-4cb9-8e52-b0611d4c06f6
- Review Job: 697eea65-5633-4940-accd-88be9b6de03e
- Started: 2026-11-18
- Finished: 2026-11-18T12:05:04+07:00

## Implementation Response

<!-- Worker appends each full `# EXTERNAL RESPONSE` block here without overwriting prior blocks. -->

# EXTERNAL RESPONSE
## META
- Phase: 2 | Started: 2026-11-18 (date only, as recorded in the journal META; exact start time not recorded) | Finished: 2026-11-18T12:05:04+07:00 | Plan dir: docs/plans/video-showcase-site
## SUMMARY
Added a Zod 4 video manifest schema, `parseVideos`, `getVideos`, and `getVideo` in `lib/videos.ts` with 13 passing Vitest cases, plus the empty `content/videos.json` and the three-entry fixture; lint, test, and both builds pass.
## FILES MODIFIED
| Action | Path | Change |
|---|---|---|
| modify | package.json | Added `zod` dependency `^4.6.7` |
| modify | pnpm-lock.yaml | Lock entry for `zod` 4.6.7 |
| create | lib/videos.ts | Schema, `Video` type, `parseVideos`, `getVideos`, `getVideo` |
| create | lib/videos.test.ts | 13 Vitest cases (RED then GREEN) |
| create | content/videos.json | `[]` |
| create | tests/fixtures/videos.json | Three entries, one per theme, host `media.example.com` |
| modify | docs/plans/video-showcase-site/phase-02/notes.md | Replaced template placeholder with `## Task 1`, `## Task 2`, `## Task 3`, and the Done When block |
| modify | docs/plans/video-showcase-site/phase-02/journal.md | META Finished, this response block |
## NOTES
- phase-02/notes.md  (## Task 1, ## Task 2, ## Task 3, Done When checks: `pnpm lint` exit 0; `pnpm test` 13 passed (13); `pnpm build` exit 0; `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` exit 0)
## SPEC COMPLIANCE
- Meets Spec? YES
## CLARIFICATIONS NEEDED
None
## NEXT
TASK_COMPLETE

# EXTERNAL RESPONSE
## META
- Phase: 2 | FIX batch: lang BCP 47 well-formedness | Started: 2026-11-18 (date only; exact start time not recorded) | Finished: 2026-11-18T12:13:14+07:00 | Plan dir: docs/plans/video-showcase-site
## SUMMARY
Replaced the `Intl.getCanonicalLocales` lang check with an RFC 5646 section 2.1 well-formedness regex in `lib/videos.ts` and added 16 lang regression cases in `lib/videos.test.ts`; before the change 5 accept cases failed by assertion, and now all 29 Vitest cases, lint, and both builds pass.
## FILES MODIFIED
| Action | Path | Change |
|---|---|---|
| modify | lib/videos.ts | Replaced `isBcp47` (Intl) with `BCP47_TAG` regex; `lang` uses `z.string().regex(...)` |
| modify | lib/videos.test.ts | Added `parseVideos lang` block: 10 accept cases and 6 reject cases |
| modify | docs/plans/video-showcase-site/phase-02/notes.md | Appended `## FIX: lang BCP 47 well-formedness (P2 review finding)` block |
| modify | docs/plans/video-showcase-site/phase-02/journal.md | Appended this response block under Implementation Response |
## NOTES
- phase-02/notes.md  (## FIX: lang BCP 47 well-formedness (P2 review finding); fresh checks: `pnpm lint` exit 0; `pnpm test` 29 passed (29); `pnpm build` exit 0; `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` exit 0)
## SPEC COMPLIANCE
- Meets Spec? YES
## CLARIFICATIONS NEEDED
None
## NEXT
TASK_COMPLETE

## Quality Review

<!-- Coordinator appends the independent review response here. -->

Review job 697eea65-5633-4940-accd-88be9b6de03e (openai, codex/terra-high), first pass at checkpoint 1fddb50:

# CODE QUALITY REVIEW
- Status: FAIL
- Findings: P2, lib/videos.ts:14, valid BCP 47 tags such as `x-private` and `i-klingon` are rejected by Intl.getCanonicalLocales; use a validator that accepts full BCP 47 syntax and add regression cases.
- Scope checked: package.json, pnpm-lock.yaml, lib/videos.ts, lib/videos.test.ts, content/videos.json, tests/fixtures/videos.json

Reviewer also judged creator.url scheme acceptance and whitespace-only title/script non-blocking. Coordinator decision: accept the finding; fix job e30ef593-5f7f-4b33-9f8a-7f3bd1e217e9 submitted on the implement session. Fix is a local logic fix with regression tests, so per review.md it closes without re-review unless it touches more than the finding.

## Review Result

- Spec Status: PASS
- Quality Status: PASS (after one fix cycle)
- Debt: Whitespace-only `title`/`script` accepted and `creator.url` accepts any URL scheme (reviewer judged non-blocking; owner Phase 4 implementer to restrict the creator link to http(s) where it renders). `lang` check is RFC 5646 well-formedness only, not IANA registry validity (owner maintainer, accepted tradeoff). Build-time call site for `getVideos()` lands in Phase 3 (owner Phase 3 implementer).
- Coordinator decisions: fix of the P2 BCP 47 finding is a local logic fix with 16 regression cases that touches only the flagged lines, so it closes without re-review. Fresh checks after fix: pnpm lint 0; pnpm test 29 passed; pnpm build 0; VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build 0.

## Final Checkpoint

- Phase base ref: refs/plans/video-showcase-site/phase-02/base
- Phase implementation ref: refs/plans/video-showcase-site/phase-02/impl
- Plan commit ref: refs/plans/video-showcase-site/impl or `pending`
- State checkpoint: temporary commit, or `n/a (untracked)` when plan artifacts
  are excluded

Phase refs retain review evidence after checkpoint consolidation. The plan ref
names the sole commit retained on the branch.

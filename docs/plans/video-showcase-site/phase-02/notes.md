<!-- refract-shared-version: 3.0.8 -->

# Phase 2 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Added `zod` with `pnpm add "zod@^4" --ignore-workspace`. Resolved version: 4.6.7.
- Created `tests/fixtures/videos.json` (three entries, slugs `intro-dark`, `paper-overview`, `tour-world3d`) during Task 1 as inert data, so the RED failures are assertions and not ENOENT. Task 3 keeps it unchanged except for Biome formatting.
- Created `lib/videos.ts` as a RED stub: `Video = Record<string, unknown>`, `parseVideos` returns `[]`, `getVideos` returns `[]`, `getVideo` returns `undefined`.
- Zod 4 APIs verified with `npx ctx7@latest` (library `/colinhacks/zod/v4.6.7`, 2 commands): `z.url()`, `z.iso.date()`, `superRefine` with `ctx.addIssue` and `path`, and `refine` message. `z.enum` and `z.infer` are standard.

### Spec deviations
- Two of the twelve cases pass against the stub by construction: `accepts an empty array` and `returns undefined for an unknown slug`. They guard against regression and do not drive the implementation.

### Tradeoffs accepted
- none

### Assumptions
- none

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test` -> `Tests  10 failed | 2 passed (12)`. Behavioral failures:
    - `getVideos > loads the fixture manifest with three entries`: `AssertionError: expected [] to have a length of 3 but got +0`
    - `getVideos > selects the manifest file named by VIDEOS_MANIFEST`: `AssertionError: expected [] to deeply equal [ Array(3) ]`
    - Six `parseVideos` rejection cases (duplicate slug, invalid slug, videoUrl host, posterUrl host, missing script, lookalike host): `AssertionError: expected [Function] to throw an error`
    - `parseVideos > reads NEXT_PUBLIC_MEDIA_HOST when validating`: `AssertionError: expected [] to have a length of 3 but got +0`
    - `getVideo > returns the entry for a known slug`: `AssertionError: expected undefined to be 'paper' // Object.is equality`
  - Earlier run before the fix below: `vi.unstubAllEnv is not a function`. That was a typo in the test file and does not count as RED. Fixed to `vi.unstubAllEnvs()`, which exists in `node_modules/vitest/dist/index.d.ts`.
  - GREEN: this task delivers the RED set. Its GREEN is recorded under Task 2.
- Root cause (bugfix only): none

## Task 2

### Decisions made
- Schema in `lib/videos.ts` as `videoSchema` (`z.object`), `manifestSchema` (`z.array(videoSchema).superRefine`), and exported `Video = z.infer<typeof videoSchema>`.
- Slug uniqueness is in `superRefine`, with `ctx.addIssue` at `path: [index, "slug"]`.
- `parseVideos` reports the first Zod issue as `videos<path>: <message>`, so the index and field appear as `videos[1].slug: ...`.
- Media host comparison: `URL.parse(url)?.hostname === mediaHost()`. `mediaHost()` reads `process.env.NEXT_PUBLIC_MEDIA_HOST` at validation time, falling back to `media.example.com` when the value is empty (`||`).
- `lang` uses the stdlib check `Intl.getCanonicalLocales`, which throws for invalid tags. No dependency added.
- `getVideos` resolves `VIDEOS_MANIFEST || "content/videos.json"` with `path.resolve`, so it is relative to `process.cwd()`.
- `getVideo` uses `getVideos().find`.
- Unknown object keys are stripped by Zod's default behavior. No `strict()` was added because the spec does not require it.
- Added two test cases beyond the spec list. One is the non-URL `videoUrl` regression below. The other is the `NEXT_PUBLIC_MEDIA_HOST` override, which the spec requires to be read at validation time.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- none

### Follow-ups for human
- Whitespace-only `title` and `script` values pass `min(1)`. The spec says "non-empty" and does not say to trim. Decide whether to trim or reject whitespace-only values.

### Test evidence
- RED -> GREEN:
  - RED: see Task 1.
  - GREEN (first pass, before the fixes below): `pnpm test` -> `Tests  1 failed | 11 passed (12)`. The failure was `reads NEXT_PUBLIC_MEDIA_HOST when validating` with `Error: videos[1].videoUrl: URL hostname must equal the media host`. Test bug: only entry 0 was changed to the new host. Fixed by mapping all entries.
  - Bugfix RED for non-URL input: `pnpm test` after temporarily changing `URL.parse(url)?.hostname` back to `new URL(url).hostname` -> `Tests  1 failed | 12 passed (13)`. Failure: `AssertionError: expected [Function] to throw error matching /^videos\[0\]\.videoUrl: / but got 'Invalid URL'`.
  - Bugfix GREEN after restoring `URL.parse`: `pnpm test` -> `Tests  13 passed (13)`.
  - Final GREEN: `pnpm test` -> `Test Files  1 passed (1)`, `Tests  13 passed (13)`, exit 0.
- Root cause (bugfix only): with `z.url().refine((url) => new URL(url).hostname === ...)`, Zod still runs the refinement after `z.url()` has already failed. A probe with `node` showed `z.url().refine(...).safeParse("not a url")` throws `TypeError: Invalid URL` from the refinement instead of returning a Zod issue. The `parseVideos` error message contract would break for that input. `URL.parse` returns `null` for invalid input without throwing. A probe confirmed `safeParse("not a url")` returns `invalid_format` and `custom` issues, with no throw.

## Task 3

### Decisions made
- Created `content/videos.json` as `[]`.
- The fixture was created under Task 1. Biome formatting was applied to `tests/fixtures/videos.json` and `content/videos.json`.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- Phase 2 does not wire `getVideos` into any build or page. `app/` is out of scope, so `pnpm build` does not read `content/videos.json` or the fixture. The two build commands below prove that the build still passes with the manifest set. Manifest validation is covered only by the Vitest cases in `lib/videos.test.ts`.

### Follow-ups for human
- Build-time validation is not wired yet. The grid or detail phase must call `getVideos()` during the static build, or the build will not validate `content/videos.json`.

### Test evidence
- RED -> GREEN:
  - RED: none. This task changes data files and adds no behavior. Behavior is covered by the Task 1 and Task 2 tests.
  - GREEN: `pnpm build` -> exit 0, `prerendered as static content`
  - GREEN: `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit 0, `prerendered as static content`
- Root cause (bugfix only): none

## Phase 2 Done When checks (fresh, run after Task 3)
- `pnpm lint` -> exit 0, `Checked 17 files in 7ms. No fixes applied.`
- `pnpm test` -> exit 0, `Tests  13 passed (13)`
- `pnpm build` -> exit 0
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit 0

## FIX: lang BCP 47 well-formedness (P2 review finding)

### Decisions made
- Replaced the `Intl.getCanonicalLocales` check (`isBcp47`) with one regex, `BCP47_TAG` in `lib/videos.ts`. It follows the RFC 5646 section 2.1 Figure 1 ABNF: `langtag`, `privateuse`, and `grandfathered`, with the irregular and regular grandfathered lists copied from the same figure. Case-insensitive (`/i`). No dependency added.
- `lang` now uses `z.string().regex(BCP47_TAG, { message: "must be a valid BCP 47 language tag" })` in place of `.refine(isBcp47, ...)`. `isBcp47` was removed because nothing else called it.
- Grammar source: `curl -sSfL https://www.rfc-editor.org/rfc/rfc5646.txt`, section 2.1 Figure 1. The `tvly extract` output was only a preview, so it was not used as the source.
- Regex checked before the change with a scratch script outside the repo (`/tmp/bcp47-probe/probe.mjs`). It matched all 10 accept and 6 reject cases in the fix request, plus RFC examples (`en-GB-oed`, `i-ami`, `sgn-CH-DE`, `de-DE-u-co-phonebk`, `zh-yue-Hant-HK`, `es-419`, and others) and extra edge cases (`x`, `en--US`, `en-US-`, `zh-min-nan-x`). All matched.

### Spec deviations
- none

### Tradeoffs accepted
- The regex checks well-formedness only. It does not check subtags against the IANA Language Subtag Registry, so syntactically valid but unregistered tags such as `zz-ZZ` are accepted. This matches RFC 5646 section 2.1 well-formedness, which the fix request scoped.
- The regex is one long literal (about 370 characters), as the fix request required. It was not split.

### Assumptions
- Case-insensitive matching accepts mixed-case input such as `EN-us`. RFC 5646 section 2.1 is case-insensitive for syntax, and the fix request asked for case-insensitive matching.

### Follow-ups for human
- Registry validity is not checked, as noted under Tradeoffs. Non-blocking.
- Reviewer-judged non-blocking items are unchanged by this fix: `creator.url` scheme acceptance, and whitespace-only `title` and `script` values (see Task 2 follow-up).

### Test evidence
- RED -> GREEN:
  - RED (current implementation, before the change): `pnpm test` -> `Tests  5 failed | 24 passed (29)`. Failing cases, each an `AssertionError` from `expect(() => parseVideos(entries)).not.toThrow()`:
    - `accepts the BCP 47 tag x-private`
    - `accepts the BCP 47 tag i-klingon`
    - `accepts the BCP 47 tag sgn-BE-FR`
    - `accepts the BCP 47 tag en-GB-oed`
    - `accepts the BCP 47 tag zh-min-nan`
    - Assertion text for `x-private` and `i-klingon` (verbose rerun with `-t "x-private|i-klingon"`): `AssertionError: expected [Function] to not throw an error but 'Error: videos[0].lang: must be a vali…' was thrown`. Vitest truncates the message.
    - The six reject cases and the five other accept cases pass on the current implementation. They are regression guards and do not drive the change.
  - GREEN: `pnpm test` -> `Test Files  1 passed (1)`, `Tests  29 passed (29)`, exit 0.
- Fresh checks after GREEN (run from `/home/ngosi/projects/scene-flow-gallery`):
  - `pnpm lint` -> exit 0, `Checked 17 files in 4ms. No fixes applied.`
  - `pnpm test` -> exit 0, `Tests  29 passed (29)`
  - `pnpm build` -> exit 0, `prerendered as static content`
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` -> exit 0, `prerendered as static content`
- Root cause (bugfix only): `Intl.getCanonicalLocales` accepts only tags that fit its locale-identifier grammar. It rejects privateuse-only tags (`x-private`) and grandfathered tags (`i-klingon`, `sgn-BE-FR`, `en-GB-oed`, `zh-min-nan` in this run). The `isBcp47` `try/catch` converted the thrown `RangeError` to `false`, so the schema rejected valid manifest entries. Reproduction: the RED run above.

# Phase 5: End-to-end smoke test and CI

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: Regressions in the core browse flow fail CI. `pnpm test:e2e` builds the fixture export, serves `out/`, and runs a Chromium smoke spec. A GitHub Actions workflow runs the full check chain.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-05/base`
- Prior State:
  - Static export (`output: "export"`, `trailingSlash: true`). `pnpm build` takes about 60 seconds. Run long commands in the background or with a long timeout.
  - `/` renders a grid of cards. Each card is a link to `/v/<slug>/` whose accessible name is built from its title, theme badge, and duration. A theme filter is a group of four toggle buttons named `All`, `Dark`, `Paper`, `World 3D` with `aria-pressed`. The result count is a `role="status"` region (`3 videos`, `1 video in Paper`). Filter state is `?theme=`. A filter with no matches shows `No videos match this theme` and a `Show all` button. The empty manifest shows `No videos yet`. Card previews mount a muted `<video>` only while the card is hovered or focused, and never under `(hover: none)` or `prefers-reduced-motion: reduce`. A failed poster keeps title, theme, and duration visible.
  - `/v/<slug>/` has a back link `All videos`, `<h1>`, a `<video controls>` player that is replaced by `Video unavailable` (`role="status"`) when the video errors, and a `Transcript` section with the script text.
  - `tests/fixtures/videos.json` has `intro-dark` (dark, vi), `paper-overview` (paper, en), `tour-world3d` (world3d, vi). All media URLs use `https://media.example.com/...`, which does not resolve.
  - `package.json` scripts: `dev`, `build`, `lint` (`biome check .`), `format`, `test` (`vitest run`). `packageManager` is `pnpm@11.22.0`. 31 Vitest tests pass. `lib/videos.ts` uses `URL.parse`, which needs Node 20.18 or later, and `package.json` has no `engines` field.
- PNPM NOTE: `/home/ngosi/pnpm-workspace.yaml` is a home-level file outside the repo that makes pnpm treat `/home/ngosi` as workspace root. Pass `--ignore-workspace` to every `pnpm add` and `pnpm install`. Do not edit that file. CI has no such file, so the workflow does not need the flag.
- Verify current setup with `npx ctx7@latest` before coding: `npx ctx7@latest library <Name> "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`. At most 3 ctx7 commands per question. Cover: `@playwright/test` (`defineConfig`, `webServer`, `use.baseURL`, `projects` with Chromium only, role locators, `page.route`, `reducedMotion` and `hasTouch` context options), the static server package you choose (recommended: `serve`; it must serve `/v/<slug>/` from `out/v/<slug>/index.html` and `/robots.txt`), and `pnpm/action-setup` plus `actions/setup-node` with pnpm cache. For GitHub Actions versions, confirm the current major tag of `actions/checkout`, `pnpm/action-setup`, and `actions/setup-node` from their official READMEs or releases and pin the major tag. Do not guess versions. Use `tvly` for web lookups if ctx7 lacks them.
- The AGENTS rule to attach to an existing browser applies to interactive automation. The Playwright test runner launches its own Chromium by design; that is expected here.

Spec contract. One file `e2e/smoke.spec.ts` with role and accessible-name locators only (`getByRole`, `getByText` of visible copy; no CSS or test-id selectors except where no role exists, and say why in a comment):

1. `grid shows three cards`: open `/`; exactly 3 links whose href matches `/v/<slug>/` are visible; the status region says `3 videos`.
2. `theme filter narrows and restores`: press `Paper`; 1 card is visible (`paper-overview`), the URL becomes `?theme=paper`, `Paper` has `aria-pressed="true"`, the status says `1 video in Paper`. Press `All`; 3 cards, the `theme` param is gone.
3. `unknown theme behaves as all`: open `/?theme=bogus`; 3 cards and `All` is pressed.
4. `card opens the video page`: click the `intro-dark` card; URL ends with `/v/intro-dark/`; the page has a `video` element with the `controls` attribute and the `Transcript` heading with that entry's script text visible (read the script from `tests/fixtures/videos.json` in the spec, do not hardcode it).
5. `no autoplay`: the video page `video` element has no `autoplay` attribute and is paused.
6. `hover preview mounts and unmounts`: on `/`, hover a card, expect a `video` element inside that card with `muted` and `loop`; move the mouse away, expect it gone. This test runs in the default Chromium context.
7. `reduced motion never mounts a preview`: new context with `reducedMotion: "reduce"`; hover a card; assert no `video` element appears (use a short bounded wait, not a fixed sleep longer than 500 ms).
8. `touch device never mounts a preview`: new context with `hasTouch: true` and `isMobile: true`; confirm via `page.evaluate(() => matchMedia("(hover: none)").matches)` that the premise holds; focus a card by keyboard (Tab) and assert no `video` appears. If Chromium does not report `(hover: none)` in this configuration, skip the test with `test.skip` and a reason, and record that in `notes.md` instead of weakening the assertion.
9. `broken poster keeps text visible`: intercept the `media.example.com` image requests with a 404 via `page.route`; open `/`; each card still shows its title, theme badge, and duration.
10. `broken video shows Video unavailable`: intercept `media.example.com` requests for the mp4 and the poster with a 404 via `page.route`; open `/v/intro-dark/`; expect `Video unavailable` visible and no `video` element.
11. `empty filter state` is not testable with the fixture (every theme has one entry); skip it and say so in `notes.md`.

No test may fetch from the real network. Add one `page.route("**/media.example.com/**", ...)` default in a shared `test.beforeEach` that aborts or fulfills with a 404 unless a test overrides it, so nothing leaves the machine.

## Invariants & Boundaries
- Preserve Phase 1 to 4 behavior. `pnpm lint`, `pnpm test` (31 tests), and `pnpm build` keep passing.
- Only Chromium. No secrets, tokens, or `secrets.*` references in the workflow. No deployment step. Least-privilege `permissions: contents: read`.
- Out of Scope: app code under `app/`, `components/`, `lib/` (fix nothing there; report a suspected app bug in `notes.md` and in the ERP clarification section instead), the media script, README.
- Do not touch `docs/plans/` except your own phase records. Do not commit; the Coordinator owns Git.

## Files
Allowed production and test paths:
- `package.json` (modify: add `@playwright/test`, the static server, `test:e2e` script, and `"engines": { "node": ">=20.18" }`)
- `pnpm-lock.yaml` (modify)
- `biome.json` (modify: only what is needed so `pnpm lint` ignores `playwright-report`, `test-results`, and any generated output)
- `vitest.config.ts` (modify: exclude `e2e/**` from test discovery, keeping the existing config)
- `.gitignore` (modify: add `/test-results/`, `/playwright-report/`, and `/blob-report/` if absent)
- `playwright.config.ts` (create)
- `e2e/smoke.spec.ts` (create)
- `.github/workflows/ci.yml` (create)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-05/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-05/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, `app/`, `components/`, `lib/`, `content/`, `tests/fixtures/`, or secrets.

## Tasks
- task-1: Add dependencies (`pnpm add -D --ignore-workspace ...`), the `test:e2e` script, the `engines` field, the Vitest exclude, the Biome ignores, and `.gitignore` lines. RED: create `e2e/smoke.spec.ts` with a trivial placeholder file first and show `pnpm test` currently would collect it (or show Vitest picks up a `*.spec.ts` under `e2e/`), then GREEN after the exclude: `pnpm test` reports 31 tests and no `e2e` file.
- task-2: Write `playwright.config.ts`: Chromium project only, `baseURL` `http://127.0.0.1:4173`, `webServer.command` builds with `VIDEOS_MANIFEST=tests/fixtures/videos.json` and then serves `out/` on port 4173 (write the command so it works in `sh` on Linux CI), `webServer.url` the base URL, `reuseExistingServer: !process.env.CI`, a generous `webServer.timeout` (at least 240000 ms), `forbidOnly: !!process.env.CI`, retries 1 on CI only, `reporter` `list` locally and `github` plus `html` (not opened) on CI. Write the spec from the contract above, one test at a time, running `pnpm test:e2e` as you go. RED evidence per behavior: show that a deliberately wrong assertion fails by assertion (for example expecting 2 cards), then correct it. Do not leave deliberate failures in the file.
- task-3: Write `.github/workflows/ci.yml`: triggers `pull_request` and `push` to `main`; `concurrency` group per ref with `cancel-in-progress`; one job on `ubuntu-latest`; steps in order: checkout, pnpm setup (no `version` input, so it uses `packageManager`), Node 24 with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build`, `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build`, `pnpm exec playwright install --with-deps chromium`, `pnpm test:e2e`, and an `actions/upload-artifact` step on failure for `playwright-report/` (verify the current major version of that action as well). Validate the YAML locally with `python3 -I -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci.yml` if PyYAML exists, or with another local parser, and record the result. Do not run the workflow remotely and do not push.
- Evidence rules: record every command and its exit code in `notes.md`. Run the full spec at least twice consecutively to check for flakiness and record both results. Finish by running `pnpm build` on the empty manifest so `out/` matches it.

## Done When
- `pnpm test:e2e` passes locally with the spec contract above (tests 8 and 11 may be skipped only with the recorded reasons).
- `pnpm test` runs 31 tests and does not collect `e2e/`.
- `pnpm lint` passes with the new files.
- Workflow YAML parses; it pins Node 24, uses the `packageManager` pnpm version, runs on pull requests and pushes to `main`, and has no secrets.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (Baseline: exit 0)
  - `pnpm test` (Baseline: exit 0, 31 tests)
  - `pnpm exec playwright install chromium && pnpm test:e2e` (Baseline: no `test:e2e` script)
  - `pnpm build` on the empty manifest as the last command (Baseline: exit 0)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-05/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-05/journal.md`, then return that block and the matching status line from `erp.md`.

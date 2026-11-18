<!-- refract-shared-version: 3.0.8 -->

# Phase 5 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Installed `@playwright/test@1.65.1` and `serve@14.2.8` as devDependencies with `pnpm add -D --ignore-workspace`. Versions come from the registry resolution at install time.
- Vitest exclude is `[...configDefaults.exclude, "e2e/**"]`, so the default Vitest excludes stay in place.
- The RED placeholder uses Vitest `test`, not Playwright `test`, so the RED failure is a collection count failure and not an import error.
- `.gitignore`: added `blob-report/` in the file's existing unanchored style. `test-results/` and `playwright-report/` already exist there, so they were not added again.
- `biome.json` was not changed in this task. Generated `playwright-report/` and `test-results/` are already excluded by `.gitignore`, and `biome.json` has `vcs.useIgnoreFile: true`. Task 2 verifies this against real generated output.

### Spec deviations
- `.gitignore` lines are unanchored (`blob-report/`) instead of anchored (`/blob-report/`), to match the existing file style. `/test-results/` and `/playwright-report/` were not added as separate lines because unanchored `test-results/` and `playwright-report/` already cover the same paths.

### Tradeoffs accepted
- The lockfile diff is large (`pnpm-lock.yaml`: 587 changed lines). Compared as `name@version` sets, the change only adds 61 entries (Playwright and `serve` with their transitive dependencies). No existing `name@version` entry was removed. The remaining removed lines are peer-suffix variant keys such as `next@16.4.6(@babel/core@7.29.13)...`, which pnpm rewrote during the install.
- `pnpm install` printed `[WARN] Issues with peer dependencies found`. This warning was not investigated because the phase does not change peer dependencies.

### Assumptions
- Playwright API usage and the `serve` CLI were checked with ctx7 before coding: Playwright docs `/websites/playwright_dev` (`webServer`, `timeout`, `route.fulfill`), and `serve` docs `/vercel/serve` (`-l tcp://host:port`).

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `pnpm test` (output piped through `tail -15`, so the exit code was not captured) -> `Test Files 2 passed (2)` and `Tests 32 passed (32)`. `npx vitest list` lists `e2e/smoke.spec.ts > placeholder`. Vitest collected the placeholder, so `e2e/` was not excluded. This is the RED state: the expected count is 31 and `e2e/` must not be collected.
  - GREEN: `pnpm test > /tmp/p5-t1-green-test.log 2>&1` -> exit 0, `Test Files 1 passed (1)`, `Tests 31 passed (31)`, and no `e2e` line in the log.
  - GREEN (lint): `pnpm lint > /tmp/p5-t1-lint.log 2>&1` -> exit 0, `Checked 28 files in 15ms. No fixes applied.`
- Root cause (bugfix only): none

## Task 2

### Decisions made
- `playwright.config.ts`: one `chromium` project (`devices["Desktop Chrome"]`), `baseURL` `http://127.0.0.1:4173`, `webServer.command` `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build && pnpm exec serve -l tcp://127.0.0.1:4173 out`, `timeout` 240000, `reuseExistingServer: !process.env.CI`, `forbidOnly: !!process.env.CI`, `retries` 1 on CI only, reporter `list` locally and `github` plus `html` (`open: "never"`) on CI.
- Locators: roles and accessible names by default. Two exceptions, each with a comment in the spec: card links use `a[href^="/v/"]` because no ARIA query selects on href; `<video>` elements use `page.locator("video")` because the element has no ARIA role.
- Status count: the contract says role `status`. The tests use `getByText` with exact visible copy (`3 videos`, `1 video in Paper`), as the contract allows. See Suspected app discrepancy below.
- Video page tests (`card opens the video page`, `no autoplay`): the mp4 request is held open with `page.route(/media\.example\.com\/.*\.mp4$/, () => {})` in a `test.describe("video page")` hook. The shared default 404 would unmount the player and show `Video unavailable`, and these tests expect the player. The broken-video test (spec test 10) covers the 404 case.
- Default media guard: `test.beforeEach` calls `page.route("**/media.example.com/**", 404)` on the `page` fixture. Tests 7 and 8 use `test.use({ reducedMotion })` and `test.use({ hasTouch, isMobile })` instead of a new context, so the same guard applies to them.
- Hover preview: `muted` and `loop` are checked with `toHaveJSProperty`, so the check does not depend on whether React writes an attribute.
- Touch test: the premise `matchMedia("(hover: none)").matches` was `true` in this Chromium run, so `test.skip` did not trigger and no test was skipped.
- Test 11 (`empty filter state`) is skipped and recorded here, not written in the file. The fixture has one entry per theme, so the empty state cannot be reached.
- Biome: `biome check --write` was run on the two new TypeScript files only (import order and line wrapping). `biome.json` is unchanged. `playwright-report/` and `test-results/` are generated and `pnpm lint` still exits 0 with them present (both are in `.gitignore`, which Biome reads through `vcs.useIgnoreFile`).
- Browser install: `pnpm exec playwright install chromium` downloaded `chromium_headless_shell-1255` (Chrome Headless Shell 159.0.8154.6) to `~/.cache/ms-playwright`, outside the repo.

### Spec deviations
- none

### Tradeoffs accepted
- Waits: tests 7 and 8 use `page.waitForTimeout(300)` before the negative assertion. This is the bounded wait the contract allows (under 500 ms). It is an absence check, so a shorter wait would weaken it.

### Assumptions
- Playwright API usage was checked with ctx7 (`/websites/playwright_dev`): `webServer`, `timeout`, `route.fulfill`, `devices`, and the context options. The `serve` listen syntax was checked with ctx7 (`/vercel/serve`): `-l tcp://host:port`.
- The static server (`serve`) serves `/v/<slug>/` from `out/v/<slug>/index.html`. Checked with `curl` on the fixture build: `/`, `/v/intro-dark/`, `/v/paper-overview/` (no trailing slash), and `/robots.txt` all returned 200.

### Suspected app discrepancy (not fixed; app code is out of scope)
- The plan (`PRIOR STATE`) says the result count is a `role="status"` region. `components/video-grid.tsx` renders the count as `<p aria-live="polite">` with no `role` attribute. Screen readers still announce `aria-live="polite"` content, but the region is not exposed as a status role. Whether to add `role="status"` is for a human to decide.
- Unverified: a poster that fails before hydration. `VideoCard` attaches `onError` only after hydration, so the code suggests a pre-hydration failure leaves the `alt=""` image in the DOM. Test 9 checks only the visible text, so it passes either way. Not tested.

### Follow-ups for human
- Decide whether `components/video-grid.tsx` should use `role="status"` as the plan says. The contract test uses visible text and passes either way.

### Test evidence
- RED -> GREEN (each behavior: a deliberate wrong assertion failed by assertion, then was corrected. Command for each: `pnpm exec playwright test -g "<title>"` against the fixture build served by a manually started `serve`. The RED assertions were removed before GREEN. No deliberate failure remains in the file):
  - grid shows three cards. RED: `toHaveCount(2)` -> `Expected: 2 Received: 3`. GREEN: exit 0, `1 passed`.
  - theme filter narrows and restores. RED: `toHaveCount(2)` -> `Expected: 2 Received: 1`. GREEN: exit 0, `1 passed`.
  - unknown theme behaves as all. RED: `aria-pressed` expected `"false"`, received `"true"`. GREEN: exit 0, `1 passed`.
  - card opens the video page. RED: URL expected `/v\/paper-overview\/$/`, received `http://127.0.0.1:4173/v/intro-dark/`. GREEN: exit 0 for the `video page` group (2 passed).
  - no autoplay. RED: `paused` expected `false`, received `true`. GREEN: exit 0, `1 passed`.
  - hover preview mounts and unmounts. RED: `loop` expected `false`, received `true`. GREEN: exit 0, `1 passed`.
  - reduced motion never mounts a preview. RED: `toHaveCount(1)` -> `Expected: 1 Received: 0`. GREEN: exit 0 (the reduced motion and touch groups, 2 passed).
  - touch device never mounts a preview. RED: `toHaveCount(1)` -> `Expected: 1 Received: 0`. GREEN: exit 0 (2 passed, not skipped).
  - broken poster keeps text visible. RED: title `toHaveCount(0)` -> `Expected: 0 Received: 1`. GREEN: exit 0 (2 passed for the two poster and video tests).
  - broken video shows Video unavailable. RED: `video` `toHaveCount(1)` -> `Expected: 1 Received: 0`. GREEN: exit 0 (2 passed for the two tests).
- Control check (temporary spec, removed after the run): on a desktop Chromium context, keyboard focus on the `intro-dark` card mounts a `video` (`toHaveCount(1)` passed). This shows that the touch test's `toHaveCount(0)` is not vacuous. The file was deleted afterwards and `e2e/` contains only `smoke.spec.ts`.
- Full suite, local (`pnpm test:e2e`, no server running at start, so the `webServer` command built the fixture and served `out/`):
  - run 1: exit 0, `10 passed (19.8s)`.
  - run 2 (consecutive): exit 0, `10 passed (18.6s)`.
  - run 3 (consecutive): exit 0, `10 passed (26.6s)`.
  - CI mode (`CI=1 pnpm test:e2e`): exit 0, `10 passed (22.2s)`. The `github` reporter printed the run summary, and `playwright-report/` was written. Biome still passed afterwards (see Decisions).
- Root cause (bugfix only): none

## Task 3

### Decisions made
- `.github/workflows/ci.yml`: triggers `pull_request` and `push` to `main`; top-level `permissions: contents: read`; `concurrency` group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`; one job `check` on `ubuntu-latest`. Steps, in order: `actions/checkout@v7`, `pnpm/action-setup@v6` (no `version` input), `actions/setup-node@v7` with `node-version: 24` and `cache: pnpm`, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build`, `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build`, `pnpm exec playwright install --with-deps chromium`, `pnpm test:e2e`, `actions/upload-artifact@v7` with `if: failure()` for `playwright-report/`.
- Action majors: from the GitHub API `releases/latest` and the tag refs. Latest releases: `actions/checkout` v7.0.1, `pnpm/action-setup` v6.1.1, `actions/setup-node` v7.1.0, `actions/upload-artifact` v7.0.2. Major tags `v7`, `v6`, `v7`, `v7` exist.
- `pnpm/action-setup` README: the `version` input can be omitted when `packageManager` declares pnpm v11 or newer. The repo has `pnpm@11.22.0`, so the omission is valid.
- `actions/setup-node` README: `cache: 'pnpm'` is supported (pnpm v6.10+) and must be set explicitly, since caching is off by default for pnpm. `pnpm/action-setup` is placed before `setup-node` so pnpm is on `PATH` when the cache is configured.
- Playwright's own report is uploaded only on failure, as the contract says. No `secrets` reference and no deploy step.

### Spec deviations
- none

### Tradeoffs accepted
- No `timeout-minutes` on the job and no `name` on each step. The contract did not list them, so they are not added.

### Assumptions
- The workflow was validated locally only, as the contract says. It was not run on GitHub and nothing was pushed.

### Follow-ups for human
- Not run remotely. The first real run on GitHub will confirm that `playwright install --with-deps` and the `pnpm test:e2e` webServer work on `ubuntu-latest`.

### Test evidence
- RED -> GREEN: no behavioral RED was captured for this task. The file did not exist before it was written, so there was no failing check to record first. The checks below are structural checks, not a behavioral RED.
  - Structural check: `python3 -I -c "import yaml,sys; ..." .github/workflows/ci.yml` -> exit 0, `parsed OK`. Triggers `['pull_request', 'push']`, `push` branches `['main']`, `permissions {'contents': 'read'}`, job `runs-on` `ubuntu-latest`, Node step `{'node-version': 24, 'cache': 'pnpm'}`, step order matches the contract, and the string `secrets` does not occur in the file (checked in the same command, `has secrets: False`). The `on` key is read as `True` by PyYAML 1.1 when not quoted; the parse code falls back to `d.get(True)`, and `on` returned the expected triggers.
- Root cause (bugfix only): none

## Final checks

Run from `/home/ngosi/projects/scene-flow-gallery` after Task 3. Each command and its exit code:
- `pnpm exec playwright install chromium` -> exit 0. Browser already present.
- `pnpm lint` -> exit 0, `Checked 30 files in 23ms. No fixes applied.`
- `pnpm test` -> exit 0, `Test Files 1 passed (1)`, `Tests 31 passed (31)`. The log contains 0 lines that mention `e2e`.
- `pnpm test:e2e` -> exit 0, `10 passed (19.7s)`, 0 skipped. Test 11 (empty filter state) is not written, as recorded under Task 2.
- YAML parse of `.github/workflows/ci.yml` (`python3 -I`) -> exit 0, triggers `pull_request` and `push`. The file does not contain the string `secrets`.
- `pnpm build` on the empty manifest, run last -> exit 0, `Compiled successfully`. `ls out/v` lists `_none`.

## Fix 1

Batch: `FIX:` for the blocking review finding on `reuseExistingServer`. Scope: `playwright.config.ts` only, plus these records.

### Decisions made
- `playwright.config.ts`: `webServer.reuseExistingServer` changed from `!process.env.CI` to `false`. No other setting changed. Every `pnpm test:e2e` now runs the `webServer.command`, which builds the fixture export and serves `out/`. A busy port 4173 fails the run with Playwright's port-in-use error.

### Spec deviations
- none

### Tradeoffs accepted
- A developer must stop any server on port 4173 before `pnpm test:e2e`. A run no longer reuses a server that is already up.
- Each local run rebuilds the fixture export, so a run takes about one minute longer than with reuse.

### Assumptions
- The empty manifest is the default `content/videos.json`. `VIDEOS_MANIFEST` is unset in the shell, so the final `pnpm build` used that default.

### Follow-ups for human
- none

### Test evidence
- Root cause (bugfix only): `reuseExistingServer: !process.env.CI` let Playwright skip the whole `webServer.command` whenever any server answered on port 4173. The build did not run, and tests ran against unrelated content.
- RED (old config, `CI` unset): `python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/p5-empty-qkQt2Q` served an empty directory, probe returned 200. Command `env -u CI pnpm test:e2e` -> exit 1, log `/tmp/p5-fix-red.log`. The log has no build output. 10 failed, each on an assertion or timeout against the foreign server. Example: `grid shows three cards` -> `Expected: 3`, `Received: 0` on `locator('a[href^="/v/"]')`.
- GREEN part 1 (new config, same server still running): `env -u CI pnpm test:e2e` -> exit 1, log `/tmp/p5-fix-green-busy.log`. Output: `Error: http://127.0.0.1:4173 is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.` The log has no build output. Wall time 35.7 s.
- Cleanup: server stopped, `curl` to 4173 returned status 000 (closed). Scratch directory `/tmp/p5-empty-qkQt2Q` deleted.
- GREEN part 2 (new config, port free): `env -u CI pnpm test:e2e` -> exit 0, `10 passed (23.9s)`, log `/tmp/p5-fix-green.log`.

### Fresh checks

Run from `/home/ngosi/projects/scene-flow-gallery` after the fix. Each command and its exit code:
- `pnpm lint` -> exit 0, `Checked 30 files in 19ms. No fixes applied.`
- `pnpm test` -> exit 0, `Test Files 1 passed (1)`, `Tests 31 passed (31)`. The log contains 0 lines that mention `e2e`.
- `pnpm build` on the empty manifest, run last -> exit 0. `out/v` lists `_none`.

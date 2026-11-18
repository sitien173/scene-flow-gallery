# Phase 6: Media preparation script and maintainer docs

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: The maintainer turns a `scene-flow` render into a gallery entry with documented commands. `scripts/prepare-video.sh` produces the published MP4 and WebP poster and prints a manifest entry. `README.md` documents local development, the add-a-video workflow, environment variables, and Cloudflare Pages settings.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-06/base`
- Prior State (Phases 1 to 5 done and committed):
  - Static export site. Scripts in `package.json`: `dev`, `build`, `lint` (`biome check .`), `format`, `test` (`vitest run`, 31 tests), `test:e2e` (Playwright, Chromium, builds `VIDEOS_MANIFEST=tests/fixtures/videos.json` and serves `out/` on 4173). `packageManager` is `pnpm@11.22.0`, `engines.node` is `>=20.18`, CI pins Node 24.
  - Environment variables in `.env.example`: `NEXT_PUBLIC_MEDIA_HOST=media.example.com`, `NEXT_PUBLIC_SITE_URL=https://gallery.example.com`. The loader also reads `VIDEOS_MANIFEST` (path relative to the cwd, default `content/videos.json`). Manifest URLs must have the media host as hostname.
  - `.gitignore` already ignores `media/`, `out/`, `.env*` except `.env.example`.
  - Manifest entry fields: `slug` (`^[a-z0-9-]+$`), `title`, `theme` (`dark`, `paper`, `world3d`), `videoUrl`, `posterUrl`, `durationSec`, `publishedAt` (ISO date), `lang` (BCP 47), `script`, `creator` (`name`, optional `url`), `sources` (`voice` is `self-recorded`, `tts-api`, or `vieneu-tts`; `screenRecordings` boolean; optional `notes`). `title`, `script` must not be blank.
  - Known behaviors worth documenting: an invalid manifest fails the build with the entry index and field; an empty manifest builds and renders `No videos yet`, and ships a noindex `out/v/_none/` page because a static export needs at least one `/v/[slug]` route (a static host may serve it with HTTP 200); `lib/videos.ts` uses `URL.parse`, so Node 20.18 or later is required.
- Tools on this machine: `ffmpeg` and `ffprobe` with `libx264`, `libwebp`, and `aac`; `awk`; `wrangler` 4.129.1 (`wrangler r2 object put <bucket>/<key> --file ... --content-type ... --cache-control ... --remote` exists with those flags). `shellcheck` is not installed; do not install it. `jq` exists but the script must not depend on it.
- Reference inputs, both HEVC video with MP3 audio at 576x1024 (9:16):
  - `$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4` (176 seconds). The name has spaces, Vietnamese characters, and a trailing dot and space before `.mp4`.
  - `$HOME/projects/scene-flow/skills/scene-flow/references/videos/Thay vì bắt Chrome gồng hàng chục tab nặng nề, giờ mỗi AI Agent đã có....mp4` (120 seconds).
- Verify before writing: `npx ctx7@latest library <Name> "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`, at most 3 ctx7 commands per question, for Wrangler `r2 object put` flags and authentication (`wrangler login`, `CLOUDFLARE_API_TOKEN`), and for Cloudflare Pages build settings for a Next.js static export (build command, output directory, Node version variable, package manager detection). Use `tvly` for lookups ctx7 lacks. State in `notes.md` what was verified and what was not. Document a fact only if you verified it; otherwise omit it or mark it unverified. In particular, check whether `wrangler r2 object put` has an upload size limit and document it only if confirmed.

Script contract: `scripts/prepare-video.sh <input> <slug> <poster-time-seconds>`

1. Bash, executable (`chmod +x`), `#!/usr/bin/env bash`, `set -euo pipefail`. Every expansion quoted. No `eval`. No credentials, bucket names, or upload commands. The script never uploads.
2. Argument handling: exactly three arguments, otherwise print usage to stderr and exit 2. `-h` or `--help` prints usage to stdout and exits 0.
3. Validation, all before any output file is written, each failure exits non-zero with a one-line message on stderr:
   - `ffmpeg`, `ffprobe`, and `awk` exist.
   - `slug` matches `^[a-z0-9-]+$`.
   - `input` is a readable regular file. If it begins with `-`, it is still handled safely (for example by prefixing `./`).
   - `poster-time` is a non-negative decimal number (`^[0-9]+(\.[0-9]+)?$`).
   - The optional environment variable `VERSION` (default `1`) matches `^[1-9][0-9]*$`. It selects the `-v<VERSION>` suffix, so a changed video can be uploaded under a new key, because the published cache header is `immutable`.
   - `NEXT_PUBLIC_MEDIA_HOST` (default `media.example.com`) is a bare hostname: letters, digits, dots, hyphens only. Reject anything else so printed JSON stays valid.
   - `ffprobe` finds a video stream and a numeric duration. The input is 9:16 by exact integer test `width * 16 == height * 9`. Anything else, such as 1280x720, exits non-zero.
   - `poster-time` is strictly below the duration (compare with `awk`, not string comparison).
4. Output, into `media/` (create it with `mkdir -p`) relative to the repository root, found from the script location so the result does not depend on the caller's cwd:
   - `media/<slug>-v<VERSION>.mp4`: H.264 High profile, `yuv420p`, AAC audio, scaled to exactly 720x1280 with square pixels (`setsar=1`), `-movflags +faststart`. Always re-encode. Use a sensible quality setting (for example `-crf 20 -preset medium`, audio about 128k). Map only the first video stream and the first audio stream if present (`-map 0:v:0 -map 0:a:0?`), so an input without audio still converts. Pass `-nostdin` and a quiet log level so progress noise cannot reach stdout.
   - `media/<slug>-v<VERSION>.webp`: one frame at `poster-time`, scaled to exactly 720x1280, `libwebp`.
   - Write to temporary files inside a `mktemp -d` directory under `media/` and move into place only on success. A `trap` removes the temporary directory on exit, so a failed encode leaves no partial files. Overwriting the same final names on a rerun is allowed.
5. stdout is only the JSON entry, nothing else. Progress and messages go to stderr. The entry is valid JSON with these keys:
   - `slug`, `videoUrl` (`https://<host>/v/<slug>-v<VERSION>.mp4`), `posterUrl` (`https://<host>/v/<slug>-v<VERSION>.webp`), `durationSec` (a number rounded to 2 decimals).
   - Placeholders for the rest, obviously fake so they get edited: `title` `"TODO"`, `theme` `"dark"`, `publishedAt` today's date from `date +%F`, `lang` `"vi"`, `script` `"TODO"`, `creator` `{ "name": "TODO" }`, `sources` `{ "voice": "self-recorded", "screenRecordings": false }`.
   - Build the JSON with `printf`, which is safe because every interpolated value is validated above. Do not add a dependency.
6. The key path `v/` in the URLs must match what the README tells the maintainer to upload (`<bucket>/v/<slug>-v<VERSION>.mp4`).

README contract: `README.md` at the repository root, concise, no emojis, written for a maintainer who has not seen this repo. Sections:

1. What this is, in two or three sentences.
2. Requirements: Node 24 (minimum 20.18), pnpm from `packageManager`, ffmpeg and ffprobe for the media script, Wrangler only for uploads.
3. Local development: install, dev server, lint, unit tests, build, e2e (`pnpm exec playwright install chromium` first), and previewing with the fixture (`VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm dev` or build).
4. Environment variables table: `NEXT_PUBLIC_MEDIA_HOST`, `NEXT_PUBLIC_SITE_URL`, `VIDEOS_MANIFEST`, `VERSION` (script only), with defaults and what each does. State that the first two are read at build time and baked into the static output.
5. Add a video, numbered steps with exact commands: render with `scene-flow`; run `scripts/prepare-video.sh "<input>" <slug> <poster-seconds> > /tmp/<slug>.json`; the upload commands, one for the MP4 and one for the WebP, each with `--content-type` and `--cache-control "public, max-age=31536000, immutable"` and `--remote`, in the form `wrangler r2 object put <bucket>/v/<slug>-v1.mp4 --file media/<slug>-v1.mp4 --content-type video/mp4 --cache-control "public, max-age=31536000, immutable" --remote` and `... .webp ... --content-type image/webp ...`; edit the printed entry and append it to `content/videos.json` (replace every `TODO`); run `pnpm build` to validate; commit. Explain that `<bucket>` is the maintainer's R2 bucket name and is not stored in the repo, and that replacing an uploaded file needs `VERSION=2`. Note TTS attribution can go in `sources.notes` and that terms were not verified.
6. Credentials: `wrangler login`, or export `CLOUDFLARE_API_TOKEN` in the shell for that session. Never commit tokens, and nothing in this repo reads them.
7. Cloudflare setup owned by the maintainer: create the R2 bucket and attach its custom domain (the host is the value of `NEXT_PUBLIC_MEDIA_HOST`), and a Pages project connected to the GitHub repository with build command `pnpm build`, output directory `out`, and the environment variables above plus whatever Node version variable Pages needs (only if verified). Note the trailing-slash check against Next.js `trailingSlash` before launch as an open item.
8. Manifest rules in a short table matching the schema, and the build-time failure behavior, the empty-manifest behavior including the `_none` route.
9. CI: one paragraph on what `.github/workflows/ci.yml` runs.
10. Placeholder domains `media.example.com` and `gallery.example.com` stay until real ones exist.

Every command in the README must be one that works as written or is clearly a placeholder in angle brackets. Do not claim a Cloudflare behavior you did not verify.

## Invariants & Boundaries
- Preserve all earlier behavior. `pnpm lint`, `pnpm test` (31 tests), and `pnpm build` keep passing. Do not modify any file outside the list below.
- No credentials or bucket names hard-coded. The script never uploads. Paths with spaces and non-ASCII characters work.
- Out of Scope: app code, tests, workflow, `package.json`, `.gitignore`, adding the script to `package.json`, uploading anything, running `wrangler` against a real account (running `wrangler r2 object put --help` is fine).
- Do not commit generated `media/` output (already ignored). Do not touch `docs/plans/` except your own phase records. Do not commit; the Coordinator owns Git.

## Files
Allowed production paths:
- `scripts/prepare-video.sh` (create)
- `README.md` (create)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-06/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-06/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, `package.json`, source, tests, `.github/`, or secrets.

## Tasks
- task-1: Write the script. RED first: before the script exists, show that each check below fails (command not found). Then build it incrementally and show GREEN. Required behavior evidence, each recorded with the command and exit code in `notes.md`:
  - `bash -n scripts/prepare-video.sh` exits 0.
  - Wrong argument count exits 2; `--help` exits 0.
  - Invalid slug (`Bad Slug`, uppercase, empty) exits non-zero and writes nothing under `media/`.
  - Missing input, directory input, non-numeric poster time, negative poster time, bad `VERSION`, and a bad `NEXT_PUBLIC_MEDIA_HOST` (for example `evil.com/x"`) each exit non-zero.
  - Landscape input exits non-zero: `ffmpeg -v error -f lavfi -i color=c=black:s=1280x720:d=1 -y /tmp/landscape.mp4 && ! scripts/prepare-video.sh /tmp/landscape.mp4 bad-ratio 0`, and no `media/bad-ratio-*` files remain.
  - Poster time at or above the duration exits non-zero: a 1 second 9:16 clip with poster time `1` and `5`, no partial output.
  - The first reference video converts with poster time 1, stdout parses with `python3 -I -c 'import json,sys; json.load(sys.stdin)'`, and a stderr-only run shows no JSON on stderr.
  - The second reference video (name with `...` and Vietnamese characters) also converts, using a short poster time, to prove path handling. Delete its outputs afterwards.
  - A 9:16 clip with no audio converts and exits 0.
  - Run the script from a different cwd (for example `cd /tmp && /home/ngosi/projects/scene-flow-gallery/scripts/prepare-video.sh ...`) and show output lands in the repo's `media/`.
- task-2: Verify Wrangler and Pages facts as described, then write `README.md` per the contract. Run every README command that can run offline (local development commands, the script, `wrangler r2 object put --help`) or state why it was not run.
- Final: after the last check, delete the scratch files under `/tmp` and the generated `media/` files you created for tests, but leave `media/sample-solar-v1.mp4` and `media/sample-solar-v1.webp` in place for the Coordinator's checks (they are ignored by Git).

## Done When
- The script produces for the first reference video: an H.264 `yuv420p` MP4 at 720x1280 with AAC audio and `faststart` (the `moov` atom precedes `mdat`; show how you verified, for example with `ffprobe -v trace` or by checking atom order), and a non-empty 720x1280 WebP.
- A non-9:16 input and an out-of-range poster time each exit non-zero.
- Printed JSON is valid, with only JSON on stdout.
- `README.md` documents every command the workflow needs and contains no unverified Cloudflare claim.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `bash -n scripts/prepare-video.sh` (Baseline: file missing)
  - `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4" sample-solar 1 | python3 -I -c 'import json,sys; json.load(sys.stdin)'` (Baseline: file missing)
  - `test "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 media/sample-solar-v1.mp4)" = "h264,720,1280"`
  - `test "$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 media/sample-solar-v1.mp4)" = "aac"`
  - `test -s media/sample-solar-v1.webp`
  - `ffmpeg -v error -f lavfi -i color=c=black:s=1280x720:d=1 -y /tmp/landscape.mp4 && ! scripts/prepare-video.sh /tmp/landscape.mp4 bad-ratio 0`
  - `pnpm lint` (Baseline: exit 0) and `pnpm test` (Baseline: exit 0, 31 tests)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Read the contracts before running any check, and record the real start time in `journal.md` META.

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-06/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-06/journal.md`, then return that block and the matching status line from `erp.md`. Put any question for the Coordinator in `CLARIFICATIONS NEEDED` and use `BLOCKED` only if it stops the work.

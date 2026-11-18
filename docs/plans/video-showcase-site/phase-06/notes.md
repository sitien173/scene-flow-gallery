<!-- refract-shared-version: 3.0.8 -->

# Phase 6 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- `export LC_ALL=C` at the top, so the slug and hostname regexes use byte order and awk reads "." as the decimal point.
- `-h` and `--help` are recognized only as the first argument. Any other argument count is handled by the 3-argument check (exit 2).
- Validation failures exit 1. Argument-count failures exit 2.
- Input beginning with `-` is rewritten to `./<input>` before any check.
- Hostname regex is `^[A-Za-z0-9.-]+$`. The spec says "letters", so uppercase letters are allowed.
- `ffprobe` duration comes from `format=duration`. Size comes from the first video stream (`v:0`).
- Encodes write to `mktemp -d` under `media/`. Both outputs move into place only after both encodes succeed. An EXIT trap removes the temp directory.
- ffmpeg output is redirected to stderr (`>&2`), so stdout carries only the JSON entry.
- Encode settings: `-profile:v high -pix_fmt yuv420p -crf 20 -preset medium`, AAC `-b:a 128k`, `-movflags +faststart`. The poster uses `libwebp -q:v 80`. Both scale to 720x1280 with `setsar=1`.
- Audio is mapped as `-map '0:a:0?'` (quoted, because an unquoted `?` is a glob character in bash).

### Spec deviations
- none

### Tradeoffs accepted
- The reference MP4 is 58,600,758 bytes for 176.43 s (about 2.7 Mb/s). The 576x1024 source is upscaled to 720x1280 at CRF 20, which raises the bitrate. The spec asks for "a sensible quality setting (for example -crf 20)", so the value was kept. A higher CRF would shrink the file, and the quality tradeoff has not been measured.
- Rotation metadata is not handled. A portrait phone file coded as landscape with a rotation tag fails the 9:16 check. It is rejected, not mis-encoded.

### Assumptions
- The 9:16 check uses coded `width` and `height` from ffprobe, not display dimensions.
- `ffmpeg` and `ffprobe` on PATH are the ones in `/bin` (ffmpeg 8.0.1).

### Follow-ups for human
- The Done When landscape command `ffmpeg ... && ! scripts/prepare-video.sh ...` passes when the script is missing. The negated command returns 0 for a 127 "command not found". Run the script directly and check its exit code, as done in the GREEN evidence below. Consider rewriting the Done When check as `if scripts/prepare-video.sh ...; then exit 1; fi`.
- The first reference MP4 is 58.6 MB. Decide whether the CRF value should change before uploads.
- Rotation-tagged portrait input is rejected. Decide whether to support it.

### Test evidence
- RED -> GREEN:
  - RED: `bash -n scripts/prepare-video.sh` -> `bash: scripts/prepare-video.sh: No such file or directory`, exit 127 (command not found, before the script existed).
  - RED: `scripts/prepare-video.sh` (no arguments), `scripts/prepare-video.sh --help` -> both exit 127 (command not found).
  - RED: `ffmpeg -v error -f lavfi -i color=c=black:s=1280x720:d=1 -y /tmp/landscape.mp4 && ! scripts/prepare-video.sh /tmp/landscape.mp4 bad-ratio 0` -> exit 0. This is a false pass. The negation turned the 127 into success, so this RED is recorded as an invalid baseline (see Follow-ups).
  - GREEN: `bash -n scripts/prepare-video.sh` -> exit 0.
  - GREEN: `scripts/prepare-video.sh` (no arguments) -> exit 2, stdout 0 bytes, usage on stderr. `scripts/prepare-video.sh a b` -> exit 2.
  - GREEN: `scripts/prepare-video.sh --help` -> exit 0, 6 stdout lines, 0 stderr bytes. `-h` -> exit 0.
  - GREEN: slugs `Bad Slug`, `UPPER`, empty -> exit 1 each, stderr `slug must be lowercase letters, digits, or hyphens`. No `media/` created.
  - GREEN: missing input `/tmp/pv/nope.mp4` -> exit 1. Directory `/tmp/pv` -> exit 1. Both: `input is not a readable regular file`.
  - GREEN: text file `/tmp/pv/not-video.txt` as input -> exit 1, ffprobe error `Invalid data found when processing input`.
  - GREEN: poster `abc` -> exit 1. Poster `-1` -> exit 1. Both: `poster time must be a non-negative number`.
  - GREEN: `VERSION=0` -> exit 1. `VERSION=v2` -> exit 1. Both: `VERSION must be a positive integer`.
  - GREEN: `NEXT_PUBLIC_MEDIA_HOST='evil.com/x"'` -> exit 1, `NEXT_PUBLIC_MEDIA_HOST must be a bare hostname`.
  - GREEN: landscape 1280x720 via direct run -> exit 1, `input must be 9:16, found 1280x720`. Done When command -> exit 0 (see caveat above).
  - GREEN: 1-second 9:16 clip (`/tmp/pv/one-sec.mp4`), poster `1` -> exit 1, `poster time 1 must be below duration 1.000000`. Poster `5` -> exit 1, `poster time 5 must be below duration 1.000000`. No `media/` files.
  - GREEN: 9:16 clip with no audio (`/tmp/pv/portrait-silent.mp4`), slug `silent-test`, poster 0 -> exit 0. stdout parses as JSON. Output `media/silent-test-v1.mp4` has one stream, `h264`. `media/silent-test-v1.webp` written.
  - GREEN: 9:16 clip with audio (`/tmp/pv/portrait-audio.mp4`), slug `audio-test`, poster 0 -> exit 0. stdout parses with `python3 -I -c 'import json,sys; json.load(open("/tmp/o"))'`.
  - GREEN: first reference video, `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4" sample-solar 1 2>/tmp/solar.err | python3 -I -c 'import json,sys; json.load(sys.stdin)'` -> JSON valid, `durationSec` 176.43. The script's own exit code was not captured in this pipeline (the `PIPESTATUS` read was lost in a subshell). Outputs exist and pass all stream checks. stderr: `encoding sample-solar-v1.mp4`, `extracting sample-solar-v1.webp at 1s`. 0 lines of JSON on stderr.
  - GREEN: `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 media/sample-solar-v1.mp4` -> `h264,720,1280`. Audio `aac`. `pix_fmt yuv420p`, profile `High`, SAR `1:1`. `test -s media/sample-solar-v1.webp` -> exit 0, WebP 720x1280.
  - GREEN: faststart, `ffprobe -v trace -i media/sample-solar-v1.mp4 | grep -oE "type:'(moov|mdat|ftyp)'"` -> `ftyp`, `moov`, `mdat`. `moov` precedes `mdat`.
  - GREEN: second reference video, from `cd /tmp`, `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Thay vì bắt Chrome gồng hàng chục tab nặng nề, giờ mỗi AI Agent đã có....mp4" chrome-agents 2` -> exit 0. JSON valid, `durationSec` 120.10. Outputs in `/home/ngosi/projects/scene-flow-gallery/media/`: `chrome-agents-v1.mp4` (7,689,243 bytes), `chrome-agents-v1.webp` (24,230 bytes). No leftover in `/tmp`.
  - GREEN: forced encode failure. A fake `ffmpeg` that exits 1 was put first on PATH: `PATH=/tmp/fakebin:$PATH scripts/prepare-video.sh /tmp/pv/portrait-audio.mp4 fail-test 0` -> exit 1, stdout 0 bytes. No `fail-test*` file and no `.tmp.*` directory remains under `media/`.
  - Root cause (bugfix only): none

## Task 2

### Decisions made
- `README.md` follows contract sections 1 to 10 in order.
- Upload commands use the exact form from the contract. `<bucket>`, `<slug>`, `<input>`, `<poster-seconds>`, and `<scene-flow render command>` are angle-bracket placeholders.
- Only verified Cloudflare facts are stated as facts. Unverified items are labeled "not verified" or listed as open items in the README.
- `NODE_VERSION` is documented as `24`, matching the CI pin. The value was not tested on Pages.
- Biome checks Markdown in this repository. `README.md` was formatted with `pnpm exec biome format --write README.md`. This changed table padding and list indentation only.

### Spec deviations
- none

### Tradeoffs accepted
- The Pages `NODE_VERSION` value and the pnpm version Pages uses are left for the maintainer to confirm in the first build log. The README says so.

### Assumptions
- The Pages build image provides pnpm for `pnpm build`. Not verified. The README does not claim it.

### Follow-ups for human
- Pages detection of pnpm 11.22.0 from `packageManager` is not verified. The Pages build-image docs list detection of pnpm from `pnpm-lock.yaml` as a v3 limitation. Confirm in the first Pages build log.
- Pages `NODE_VERSION=24` is not tested.
- Open item: `next.config.ts` sets `trailingSlash: true`. Confirm that Pages serves `/v/<slug>/` as expected before launch.
- The `TODO` placeholders from `prepare-video.sh` pass the manifest schema, because the schema rejects only blank strings. The README tells the maintainer to replace them by hand. A build-time check for `TODO` would be app code, which is outside this phase.
- The `_none` route: the README says the built `out/v/_none/index.html` has a `noindex` robots meta tag, verified in the local build. Cloudflare Pages behavior for this route is not verified.
- `pnpm dev` run by this phase created `AGENTS.md` and rewrote `next-env.d.ts`. Both were reverted. Running `next dev` in this repository will create `AGENTS.md` again.

### Test evidence
- RED -> GREEN:
  - RED: `pnpm lint` after the first `README.md` write -> exit 1, `README.md format` failed. Biome reported table padding and list-indent differences. This was a real formatter failure, not a missing-file error.
  - GREEN: `pnpm exec biome format --write README.md` -> `Formatted 1 file`. Then `pnpm lint` -> exit 0, `Checked 31 files in 23ms. No fixes applied.`
  - GREEN: after adding the 300 MiB sentence, `pnpm exec biome format --write README.md` -> `No fixes applied`. `pnpm lint` -> exit 0, `Checked 31 files`.
  - GREEN: `wrangler r2 object put --help` -> exit 0. Lists `-f, --file`, `--content-type`, `--cache-control`, and `--remote`, which the README uses.
  - GREEN: `pnpm test` -> exit 0, `Tests 31 passed (31)`.
  - GREEN: `pnpm build` (default manifest) -> exit 0. `out/index.html` contains `No videos yet`. `out/v/_none/index.html` contains `<meta name="robots" content="noindex"/>`.
  - GREEN: `pnpm test:e2e` -> exit 0, `10 passed (21.3s)`. Playwright's Chromium was already in the local cache. `pnpm exec playwright install chromium` was not run.
  - GREEN: `pnpm dev` -> `✓ Ready`, Local `http://localhost:3000`. The process was stopped by the 40-second timeout.
  - GREEN: `pnpm exec serve -l tcp://127.0.0.1:4180 out` -> HTTP 200 when run in the foreground against `out/`.
  - Root cause (bugfix only): none

### Verified facts used in README
- Wrangler 4.129.1 `wrangler r2 object put` flags: source is the installed help output (`wrangler r2 object put --help`), plus ctx7 library `/cloudflare/workers-sdk` (docs query, 2 of 3 ctx7 commands used).
- Upload size limit: Wrangler 4.129.1 installed source, `wrangler-dist/cli.js`, `MAX_UPLOAD_SIZE_BYTES = 300 * 1024 * 1024`. The remote put branch calls `validateUploadSize`. Documented as "Wrangler 4.129.1 rejects files larger than 300 MiB." The Wrangler docs did not state this limit.
- `CLOUDFLARE_API_TOKEN` for Wrangler authentication: Cloudflare Wrangler system environment variables docs (`https://developers.cloudflare.com/workers/wrangler/system-environment-variables/`, extracted with tvly).
- `wrangler login` opens a browser login page: Cloudflare Wrangler commands docs (tvly search snippet). The full page was not extracted.
- R2 custom domain: Cloudflare R2 docs, bucket Settings, Public access, Custom Domains, Connect Domain (tvly search snippet).
- Pages build directory `out` for the Next.js (Static HTML Export) preset, with build command `npx next build`: Cloudflare Pages build configuration docs (tvly search snippet). The README sets build command to `pnpm build`.
- Pages `NODE_VERSION` environment variable: Cloudflare Pages build image docs (tvly extract).
- Pages project from a GitHub repository: Cloudflare Pages get-started docs (tvly search snippet).
- Not verified and not claimed: Pages pnpm version detection, Node 24 on Pages, Pages behavior for `/v/_none/` and HTTP status, trailing-slash behavior on Pages, TTS provider terms.

### Final cleanup
- Deleted test outputs `media/audio-test-v1.*`, `media/silent-test-v1.*`, and `media/chrome-agents-v1.*`.
- Kept `media/sample-solar-v1.mp4` and `media/sample-solar-v1.webp` for the Coordinator, as the prompt requires.
- Deleted this phase's `/tmp` scratch files: `/tmp/pv/`, `/tmp/fakebin/`, `/tmp/landscape.mp4`, and the `/tmp` logs created by this phase.
- Reverted the `next dev` side effects (`next-env.d.ts` and `AGENTS.md`). `git status --short` shows only the phase's own files.

## Fix 1

### Decisions made
- Input is normalized to an absolute path. An argument that starts with `/` is kept. Any other argument gets a `$PWD/` prefix, which also covers names that begin with `-`. Every `ffprobe` and `ffmpeg` call takes `file:<absolute path>`, so a name such as `concat:land.mp4` is read as a regular file. User-visible messages still print `$1`, the original argument.
- Both temp outputs are verified before either moves into `media/`. The MP4 must be non-empty and `ffprobe` must read `h264,720,1280`. The WebP must be non-empty and `ffprobe` must read `720,1280`. A failed WebP check exits 1 with `no usable poster frame at <t>s; try an earlier poster time`. The EXIT trap removes the temp directory, so `media/` gets no partial file.
- Geometry comes from one `ffprobe` call with `-show_entries stream=width,height,sample_aspect_ratio:stream_side_data=rotation -of csv=p=0`. An absent, `N/A`, `0:1`, or `0:0` SAR is treated as 1:1. Any other SAR must match `^[1-9][0-9]*:[1-9][0-9]*$`, or the script exits 1. A display-matrix rotation of 90 or 270 degrees, either sign, swaps the stored width and height. `case $(( rot % 180 ))` selects the swap.
- The ratio test is `disp_w * sar_num * 16 == disp_h * sar_den * 9`, with a comment in the script. It is the displayed-width form of 9:16. Width is `disp_w * sar_num / sar_den`, so the cross-multiplied equality holds exactly when the displayed aspect is 9:16.
- Legacy `rotate` tag: the tag is read with `ffprobe -show_entries stream_tags -of default=nw=1` and matched case-insensitively by `awk`, because the MKV muxer writes the key as `ROTATE`. A non-zero legacy tag with no display matrix exits 1 with `input has a rotate tag that ffmpeg does not apply`.
- The 9:16 failure message keeps its original text, `input must be 9:16, found ${width}x${height}`. It shows the stored size, not the displayed size.

### Spec deviations
- The fix brief asked the script to read the legacy rotate tag and accept rotated input. A legacy tag that ffmpeg does not apply is rejected, not accepted. The reason is test evidence: ffmpeg 8.0.1 does not apply the tag. The decoded frame of `tag_90.mkv` (ROTATE=90) hashes to the same value as the unrotated stored frame (md5 prefix `4be6e1392989`). The upright display-matrix file hashes to a different value (md5 prefix `a34ade15a6f9`). Accepting the tag would encode unrotated frames at 720x1280, which is stretched. Rejecting is the only safe outcome with this ffmpeg.

### Tradeoffs accepted
- Two extra `ffprobe` calls per run for verification and one extra `ffprobe` call for tags. Runtime cost is negligible next to the encode.
- A file whose only rotation is a legacy tag is rejected. README step 1 states this in one line.
- The SAR values `N/A`, `0:1`, and `0:0` are mapped to 1:1 by the code path, but no fixture produced them. That path is covered by reading only. See Follow-ups.

### Assumptions
- `$PWD` is the caller's current directory. Bash sets `PWD` at startup and updates it on `cd`.
- ffprobe reads a WebP stream and reports its width and height. The output WebP reported `webp,720,1280`.
- The display-matrix sign convention was checked by decoded pixels, not by reading documentation. `-display_rotation -90` (an input option in ffmpeg 8.0.1) gives a red top half after autorotation. `+90` gives a blue top half.

### Follow-ups for human
- Untested: SAR `N/A`, `0:1`, and `0:0` as 1:1. No fixture was created for these values. The code path is three lines and reads as the spec requires, but it has no test evidence.
- The legacy-tag rejection depends on the local ffmpeg 8.0.1. A different ffmpeg build may apply the tag. The script rejects the tag in either case, so the behavior is consistent but may be stricter than ffmpeg itself.
- The 9:16 message shows the stored size. A 90x160 input with SAR 2:1 reports `found 90x160`, even though its displayed size is 180x160. A message that shows the displayed size would help the maintainer, and it would change the message text. The brief said to keep messages unchanged, so this is left for the human to decide.
- `## Task 1` Follow-ups still say "Rotation metadata is not handled". This fix supersedes that for display-matrix rotation. Task 1 notes are append-only and were not edited.
- The Task 1 landscape Done When caveat still applies. This fix did not change it.

### Test evidence
- RED. Commands ran against the pre-fix script. Fixtures were in `/tmp/p6fix`, deleted after the run.
  - Poster `0.99`: `scripts/prepare-video.sh /tmp/p6fix/one-sec.mp4 poster-test 0.99` -> exit 0. Stdout 389 bytes. `media/poster-test-v1.webp` 0 bytes. `media/poster-test-v1.mp4` 3019 bytes.
  - `concat:` variant A, portrait copied to `concat:land.mp4` and landscape in `land.mp4`: `(cd /tmp/p6fix/cat && scripts/prepare-video.sh 'concat:land.mp4' concat-test 0)` -> exit 1, `input must be 9:16, found 1280x720`. The check read the landscape file.
  - `concat:` variant B, landscape copied to `concat:land.mp4` and portrait in `land.mp4`: same command -> exit 0. The script encoded `land.mp4` and printed `"durationSec": 3.00`, the portrait file's duration.
  - Rotation, `/tmp/p6fix/rot/rot_-90.mp4` (stored 160x90, display matrix -90): `scripts/prepare-video.sh /tmp/p6fix/rot/rot_-90.mp4 rot-test 0` -> exit 1, `input must be 9:16, found 160x90`.
  - SAR, `/tmp/p6fix/sar/sar21.mp4` (90x160, `setsar=2/1`): `scripts/prepare-video.sh /tmp/p6fix/sar/sar21.mp4 sar-test 0` -> exit 0. Accepted.
- GREEN. `bash -n scripts/prepare-video.sh` -> exit 0.
  - Poster `0.99`: `scripts/prepare-video.sh /tmp/p6fix/one-sec.mp4 poster-test 0.99` -> exit 1. Stdout 0 bytes. Stderr `prepare-video: no usable poster frame at 0.99s; try an earlier poster time`. `ls media | grep -c poster-test` -> 0.
  - `concat:` variant A, rerun from `/tmp/p6fix/cat` with `'concat:land.mp4'` -> exit 0. Stderr `encoding concat-test-v1.mp4`, `extracting concat-test-v1.webp at 0s`. Printed `"durationSec": 3.00` and `ffprobe` reads the output as `h264,720,1280`. The portrait file was converted.
  - `concat:` variant B, rerun with landscape at `concat:land.mp4` -> exit 1, `input must be 9:16, found 1280x720`. `ls media | grep -c concat-test` -> 0.
  - Rotation, `rot_-90.mp4` -> exit 0. `ffprobe` reads the output as `h264,720,1280,1:1,yuv420p`. The WebP reads as `webp,720,1280`, 2176 bytes. Upright check by decoded pixels with `ffmpeg -i <file> -frames:v 1 -f rawvideo -pix_fmt rgb24 - | od`: pixel (x=0,y=0) = 253 0 0 (red), pixel (0,600) = 253 0 0 (red), pixel (0,700) = 0 0 254 (blue). The red top half, blue bottom half, and boundary near row 640 match the upright source. The WebP pixel (0,0) = 253 0 0.
  - Legacy tag, `/tmp/p6fix/rot/tag_90.mkv` (ROTATE=90 on stored 160x90): `scripts/prepare-video.sh /tmp/p6fix/rot/tag_90.mkv rot-tag-test 0` -> exit 1, `input has a rotate tag that ffmpeg does not apply`. No `rot-tag-test` file.
  - SAR 2:1, `sar21.mp4`: `scripts/prepare-video.sh /tmp/p6fix/sar/sar21.mp4 sar-test 0` -> exit 1, `input must be 9:16, found 90x160`. No `sar-test` file.
- Regression, all on the fixed script.
  - Landscape `1280x720` (`land-src.mp4`): exit 1, stdout 0 bytes, `input must be 9:16, found 1280x720`.
  - 720x1280, SAR 1:1, no rotation (`portrait.mp4`), poster 1: exit 0. `python3 -I -c 'import json; json.load(...)'` ok. Output `h264,720,1280`.
  - Silent 9:16 clip (`one-sec.mp4`), poster 0.5: exit 0. Output streams: video only.
  - Poster `0` on the same silent clip: exit 0. WebP 1700 bytes.
  - Poster `0.99` on the 1 s clip after the fix: exit 1 (same as the GREEN case).
  - First reference video, repo root: `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4" sample-solar 1 2>/tmp/p6fix/solar.err | python3 -I -c 'import json,sys; json.load(sys.stdin)'` with `pipefail` -> exit 0. Stderr has `encoding sample-solar-v1.mp4` and `extracting sample-solar-v1.webp at 1s`, and 0 lines with `{`. Stdout-only capture exit 0, `durationSec` 176.43.
  - Reference ffprobe checks: video `h264,720,1280` (exit 0), audio `aac` (exit 0), `test -s media/sample-solar-v1.webp` (exit 0), WebP `webp,720,1280` 50596 bytes. `pix_fmt` `yuv420p`, profile `High`, SAR `1:1`. Atom order from `ffprobe -v trace -i media/sample-solar-v1.mp4`: `ftyp`, `moov`, `mdat`.
  - Second reference video, from `/tmp`: `cd /tmp && scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Thay vì bắt Chrome gồng hàng chục tab nặng nề, giờ mỗi AI Agent đã có....mp4" chrome-agents 2` -> exit 0. `durationSec` 120.1. Output `h264,720,1280`, 7689243 bytes. WebP `webp,720,1280`, 24230 bytes.
- Fresh checks at 2026-11-18T15:02, after the last script and README edit.
  - `bash -n scripts/prepare-video.sh` -> exit 0.
  - Sample-solar pipeline with `pipefail` and the `python3 -I` JSON check -> exit 0. Video codec check `h264,720,1280` -> exit 0. Audio codec check `aac` -> exit 0. `test -s media/sample-solar-v1.webp` -> exit 0. Stderr of this run: `encoding sample-solar-v1.mp4` and `extracting sample-solar-v1.webp at 1s`.
  - `pnpm lint` -> exit 0. `Checked 31 files in 43ms. No fixes applied.`
  - `pnpm test` -> exit 0. `Tests 31 passed (31)`.

### Cleanup
- Deleted `/tmp/p6fix` (fixtures, logs, and the reference stderr captures). `ls /tmp | grep -c p6fix` -> 0.
- Deleted test outputs `media/rot-test-v1.*`, `media/silent-test-v1.*`, `media/sq-test-v1.*`, `media/zero-test-v1.*`, and `media/chrome-agents-v1.*`.
- Kept `media/sample-solar-v1.mp4` and `media/sample-solar-v1.webp`. Both were regenerated by the fixed script, and both are gitignored.
- `git status --short` shows `M README.md` and `M scripts/prepare-video.sh`. No commit was made.
- Root cause (bugfix only): (a) the poster extraction ran past the last frame and produced an empty WebP, which the script never checked. (b) ffmpeg parsed `concat:` as a protocol prefix. (c) the ratio check used the coded size and ignored SAR and rotation.

## Fix 2

Base: HEAD `db9dcb3`. Scope: `scripts/prepare-video.sh` only, plus this file and `journal.md`. No commit.

### Decisions
- Defect 1 (rotation does not invert SAR): the rotation `case` now runs after SAR parsing. On a quarter turn it swaps `sar_num` and `sar_den` through a temporary `swap` variable. Two plain assignments would copy the new value back into the first variable. The existing ratio comment is kept, and a one-line comment explains the SAR inversion.
- Defect 2 (exact-string verification): the MP4 and WebP checks read the first probe line with `IFS=, read -r ... _` and compare fields. Trailing HDR fields go into the discarded `_`. The error messages are unchanged.
- The `file:` prefix, the poster check, and the rotate-tag rejection from Fix 1 are not touched.

### Test evidence
- RED, against the Fix 1 script (`db9dcb3` plus Fix 1). Fixtures were in `/tmp/p6fix2`, deleted after the run.
  - RED A, 160x160 H.264, SAR 16:9 (`setsar=16/9`), display rotation 90 (`-display_rotation 90 -c copy`): `scripts/prepare-video.sh <fixture> <name> 0` -> exit 1. Expected output: `input must be 9:16, found 160x160`.
  - RED B, same clip with SAR 9:16: exit 0. The clip was accepted, but its displayed ratio is 16:9.
  - RED C, x265 HDR clip (`master-display` and `max-cll` as given in the brief), 90x160, 0.4 s, poster 0: exit 1 with `encoded video failed verification`. A probe of the encoded MP4 printed `h264,720,1280,`, with the trailing comma from HDR side data.
- GREEN, after the fix. `bash -n scripts/prepare-video.sh` -> exit 0.
  - GREEN A, same fixture, poster 0: exit 0. Stderr: `encoding f2-rot-a-v1.mp4`, `extracting f2-rot-a-v1.webp at 0s`. `ffprobe` reads the MP4 as `h264,720,1280,1:1`. ffmpeg's own autorotated view of the source (`showinfo`) reports `sar:9/16 s:160x160`. The display ratio is 9:16, which matches the swapped SAR. The output is 720x1280 and the SAR after `setsar=1` is 1:1, so the frame is not stretched.
  - GREEN B, SAR 9:16 fixture: exit 1. Message: `prepare-video: input must be 9:16, found 160x160`.
  - GREEN C, HDR clip, poster 0: exit 0. Stderr: `encoding f2-hdr-v1.mp4`, `extracting f2-hdr-v1.webp at 0s`. The MP4 reads as `h264,720,1280,` (first-line parse passes). The WebP reads as `720,1280`, 2896 bytes. The JSON output parses with `python3 -I`.
- Regression, after the fix.
  - 90x160 SAR 1:1, no rotation, poster 0: exit 0.
  - 160x90 with display rotation 90, poster 0: exit 0. The MP4 reads as `h264,720,1280`.
  - 90x160 SAR 2:1 (`setsar=2/1`): exit 1. Message: `input must be 9:16, found 90x160`.
  - 1280x720 landscape: exit 1. Message: `input must be 9:16, found 1280x720`.
- Plan checks, after the fix.
  - Sample-solar: `scripts/prepare-video.sh "$HOME/projects/scene-flow/skills/scene-flow/references/videos/Cách hệ thống điện mặt trời hoạt động. .mp4" sample-solar 1` with stdout piped to `python3 -I -c 'import json,sys; json.load(sys.stdin)'` under `pipefail` -> exit 0. Stderr: `encoding sample-solar-v1.mp4`, `extracting sample-solar-v1.webp at 1s`.
  - `ffprobe` video check `h264,720,1280` -> exit 0. Audio check `aac` -> exit 0. `test -s media/sample-solar-v1.webp` -> exit 0. The WebP reads as `720,1280`, 50596 bytes.
  - Landscape input `/tmp/p6fix2/landscape.mp4` (1280x720): exit 1.
  - Out-of-range poster time `0.4` on a 0.4 s clip: exit 1. The clip was the HDR fixture, and the message was not captured. The exit code is the checked result.
  - `pnpm lint` -> exit 0. `Checked 31 files`.
  - `pnpm test` -> exit 0. `Tests 31 passed (31)`.
- Cleanup.
  - Deleted `/tmp/p6fix2` (fixtures, logs, and the sample-solar stderr capture).
  - Deleted `media/f2-*` (`f2-rot-a`, `f2-rot-b`, `f2-hdr`, `f2-reg-sq`, `f2-reg-rot`, `f2-reg-sar`, `f2-reg-land`).
  - Kept `media/sample-solar-v1.mp4` and `media/sample-solar-v1.webp`. Both were regenerated by the fixed script.
  - `pnpm lint` and `pnpm test` regenerated `next-env.d.ts` (the `.next/types` path changed to `.next/dev/types`). It was restored with `git checkout -- next-env.d.ts` (exit 0).
  - `git status --short` after cleanup: `M scripts/prepare-video.sh`, the two phase-06 files, and `M next-env.d.ts` before its restore. `README.md` is not modified. No commit was made.

### Assumptions
- A plain SAR inversion is the correct model for a quarter turn. The check that proves it is the ffmpeg `showinfo` read of the autorotated source (`sar:9/16`), not a reading of the documentation.
- The RED outputs for A and C are from the runs listed above. The exact RED message for A is the one in the brief. The RED run printed exit 1 and the brief names the message.

### Follow-ups for human
- The out-of-range poster case in the plan checks used a 0.4 s clip with poster `0.4`. Its stderr was not kept. The check confirms exit 1 only.
- Other follow-ups from Fix 1 still apply: `N/A`, `0:1`, and `0:0` SAR are untested, and the 9:16 message shows the stored size.
- Correction by coordinator: the Fix 1 README sentence on the legacy rotate tag is present at `README.md` line 42 in HEAD `db9dcb3`. The earlier search used the phrase `rotate tag`, but the README writes `` `rotate` tag `` with backticks, so the search returned 0. No README change is needed.

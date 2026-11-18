# Phase 2: Validated video manifest

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: A Zod 4 schema and loader validate the video manifest. Invalid manifests fail with a precise message naming the entry index and field. Valid ones load as typed data.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-02/base`
- Prior State: Phase 1 delivered the toolchain: Next.js 16.4.6 static export, React 19, Tailwind v4, Biome (`pnpm lint` is `biome check .`), Vitest (`pnpm test` is `vitest run`, `passWithNoTests: true`), pnpm 11.22.0. `app/page.tsx` is a placeholder heading. `tsconfig.json` has the `@/*` path alias, but `vitest.config.ts` does not resolve it, so inside `lib/` use relative imports.
- PNPM NOTE: `/home/ngosi/pnpm-workspace.yaml` is a home-level file outside the repo that makes pnpm treat `/home/ngosi` as workspace root. Run `pnpm add zod --ignore-workspace` and any other install with `--ignore-workspace`. Do not edit that file.
- Verify Zod 4 APIs with `npx ctx7@latest` before coding: `npx ctx7@latest library Zod "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`. At most 3 ctx7 commands per question. Cover `z.url()`, `z.iso.date()`, `superRefine`, issue `path`, and `z.enum`.

Manifest contract from `DESIGN.md` section "Architecture and Data Flow". `content/videos.json` is a JSON array of entries:

| Field | Type | Rule |
|---|---|---|
| `slug` | string | `^[a-z0-9-]+$`, unique across entries |
| `title` | string | non-empty |
| `theme` | enum | `dark`, `paper`, `world3d` |
| `videoUrl` | URL | hostname equals the media host |
| `posterUrl` | URL | hostname equals the media host |
| `durationSec` | number | positive |
| `publishedAt` | date | ISO 8601 date, for example `2026-11-01` |
| `lang` | string | valid BCP 47 tag, for example `vi`, `en` |
| `script` | string | non-empty |
| `creator` | object | `name` required non-empty, `url` optional URL |
| `sources` | object | `voice` is `self-recorded`, `tts-api`, or `vieneu-tts`; `screenRecordings` boolean; `notes` optional string |

Media host: `process.env.NEXT_PUBLIC_MEDIA_HOST`, defaulting to `media.example.com`. Compare the parsed URL hostname with equality, never a string prefix or `includes`. Read the env var when validating, not at module load, so tests can change it.

Loader: `getVideos()` reads the file at `process.env.VIDEOS_MANIFEST` when set (path relative to the process cwd), else `content/videos.json`, validates it, and returns typed `Video[]`. `getVideo(slug)` returns the entry or `undefined`. On failure it throws an `Error` whose message names the entry index and field path, for example `videos[1].slug: ...`. An invalid entry is never filtered out silently. Export the `Video` type from the schema with `z.infer`. A pure `parseVideos(raw: unknown)` that does the validation is acceptable and expected so tests can feed objects without files.

## Invariants & Boundaries
- Preserve: all Phase 1 files and behavior. `pnpm lint`, `pnpm test`, and `pnpm build` must keep passing.
- Schema fields, enums, and rules exactly as the table. Not looser than `DESIGN.md`. No extra required fields.
- Out of Scope: any UI change, `app/` changes, Playwright, CI, the grid, detail pages.
- Fixture URLs use `https://media.example.com/`.
- Do not touch `docs/plans/` except your own phase records. Do not commit; the Coordinator owns Git.

## Files
Allowed production and test paths:
- `package.json` (modify: add `zod` dependency, major 4)
- `pnpm-lock.yaml` (modify)
- `lib/videos.ts` (create: schema, `Video` type, `parseVideos`, `getVideos`, `getVideo`)
- `lib/videos.test.ts` (create: Vitest cases)
- `content/videos.json` (create: `[]`)
- `tests/fixtures/videos.json` (create: three entries, one per theme `dark`, `paper`, `world3d`, with Vietnamese and English titles, `lang` tags `vi` and `en`, distinct slugs matching `^[a-z0-9-]+$`, distinct non-empty `script` text, `creator`, `sources`, host `media.example.com`)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-02/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-02/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, `app/`, or secrets. Do not add other dependencies.

## Tasks
- task-1: Write failing Vitest cases first in `lib/videos.test.ts`. RED must be a behavioral assertion failure, not an import error, so create a stub `lib/videos.ts` that compiles but fails the assertions if needed. Cases: the fixture loads and has three entries; duplicate slug, invalid slug `Bad Slug`, foreign host on `videoUrl`, foreign host on `posterUrl`, and missing `script` each reject with the entry index and field name in the message; an empty array loads; also a host check that a lookalike such as `https://media.example.com.evil.test/x.mp4` is rejected; `getVideo` returns an entry by slug and `undefined` for an unknown slug; `VIDEOS_MANIFEST` selects the file.
- task-2: Implement the schema with `superRefine` for slug uniqueness. Export `Video`, `parseVideos`, `getVideos`, and `getVideo`.
- task-3: Write `content/videos.json` as `[]` and the three-entry fixture. Run the build with the empty manifest and with `VIDEOS_MANIFEST=tests/fixtures/videos.json`.

## Done When
- All new Vitest cases pass.
- `pnpm build` passes with the empty `content/videos.json`.
- `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` passes.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm lint` (Baseline: exit 0)
  - `pnpm test` (Baseline: exit 0, no test files)
  - `pnpm build` (Baseline: exit 0)
  - `VIDEOS_MANIFEST=tests/fixtures/videos.json pnpm build` (Baseline: exit 0)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-02/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-02/journal.md`, then return that block and the matching status line from `erp.md`.

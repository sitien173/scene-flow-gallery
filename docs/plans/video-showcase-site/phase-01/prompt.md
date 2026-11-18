# Phase 1: Toolchain scaffold that builds a static export

## Goal & Outcome
- Plan Goal: A static Next.js 16 gallery in `/home/ngosi/projects/scene-flow-gallery` that lists `scene-flow` videos from a Zod-validated manifest, with a theme-filtered grid, one static page per video, SEO metadata, a media preparation script, tests, and CI.
- Phase Outcome: `pnpm lint`, `pnpm test`, and `pnpm build` pass on a minimal placeholder home page and `pnpm build` writes `out/index.html`.

## Context & Architecture
- Code root: `/home/ngosi/projects/scene-flow-gallery` | Records root: `/home/ngosi/projects/scene-flow-gallery` | Branch: `main` | Base: `refs/plans/video-showcase-site/phase-01/base`
- Prior State: The repository holds only plan documents under `docs/plans/` and one empty initial commit. No `package.json` exists.
- Code Context: Greenfield. Toolchain on this host: Node `v24.18.0`, pnpm `11.22.0`.
- Stack: Next.js 16 App Router with Turbopack, React 19, TypeScript, Tailwind CSS v4 with CSS-first config in `app/globals.css`, shadcn/ui on Base UI, Biome, Vitest, pnpm. Zod 4 is added in Phase 2, not now.
- Verify current setup steps with `npx ctx7@latest` before running any generator: `npx ctx7@latest library <Name> "<question>"` then `npx ctx7@latest docs <libraryId> "<question>"`. Cover Next.js 16, shadcn/ui with Base UI, Tailwind v4, Biome, and Vitest. At most 3 ctx7 commands per question. Never put secrets in queries.

## Invariants & Boundaries
- Preserve: everything under `docs/plans/`.
- Out of Scope: any app feature beyond a placeholder heading; ESLint, `eslint-config-next`, `next lint`, or any ESLint config file; Zod, Playwright, CI, manifest, grid, detail pages.
- Do not touch `docs/plans/`. Do not commit; the Coordinator owns Git.

## Files
Allowed production and test paths:
- `package.json` (create: scripts `dev`, `build`, `lint` as `biome check .`, `format` as `biome format --write .`, `test` as `vitest run`; set a `packageManager` field with the installed pnpm version)
- `pnpm-lock.yaml` (create)
- `tsconfig.json` (create)
- `next.config.ts` (create: `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`)
- `biome.json` (create)
- `vitest.config.ts` (create: must pass with zero test files via `passWithNoTests: true`)
- `components.json` (create: shadcn/ui on Base UI)
- `postcss.config.mjs` (create)
- `app/layout.tsx` (create: Be Vietnam Pro through `next/font/google` with `latin` and `vietnamese` subsets)
- `app/page.tsx` (create: placeholder heading only)
- `app/globals.css` (create: Tailwind v4 CSS-first config)
- `lib/utils.ts` (create: shadcn `cn` helper)
- `.gitignore` (create: `node_modules/`, `.next/`, `out/`, `media/`, `test-results/`, `playwright-report/`, and `.env*` except `.env.example`)
- `.env.example` (create: `NEXT_PUBLIC_MEDIA_HOST=media.example.com` and `NEXT_PUBLIC_SITE_URL=https://gallery.example.com`)
- `next-env.d.ts` (create)

Worker-owned phase records:
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-01/notes.md` (append `## Task <M>` blocks)
- `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-01/journal.md` (append `# EXTERNAL RESPONSE` under `## Implementation Response`)

Read-only / Forbidden:
- Do not edit `PLAN.md`, `DESIGN.md`, `.handover.md`, `prompt.md`, other phases, or secrets. Remove any generator artifact outside the Files list, such as boilerplate assets, an ESLint config, or a README.

## Tasks
- task-1: Verify setup docs through ctx7. Generate the project in a way that does not overwrite `docs/plans/`, for example scaffold into a temporary directory outside the repo and copy only the declared files in. Remove ESLint artifacts. Add the scripts above. RED: `pnpm lint` and `pnpm build` fail before the config exists. GREEN: they pass after.
- task-2: Configure static export in `next.config.ts` as specified.
- task-3: Initialize shadcn/ui with Base UI primitives and `lib/utils.ts`. Load Be Vietnam Pro in `app/layout.tsx` with subsets `latin` and `vietnamese`. Keep `app/page.tsx` to a placeholder heading.
- task-4: Write `.gitignore` and `.env.example` as specified. Confirm `.env` is ignored and `.env.example` is not with `git check-ignore`.

## Done When
- `pnpm lint`, `pnpm test`, and `pnpm build` exit 0.
- `out/index.html` exists after `pnpm build`.
- No `eslint` dependency or config file exists.
- Versions are Next.js 16, React 19, and Tailwind v4, matching the docs fetched through ctx7.
- Run from `/home/ngosi/projects/scene-flow-gallery`:
  - `pnpm install --frozen-lockfile` (Baseline: no `package.json`, cannot run)
  - `pnpm lint` (Baseline: cannot run)
  - `pnpm test` (Baseline: cannot run)
  - `pnpm build && test -f out/index.html` (Baseline: cannot run)

## Rules
Read and follow these bundled contracts:
- Contract: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/worker-contract.md`
- Response: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/erp.md`
- Notes: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/notes-template.md`
- Journal: `/home/ngosi/.claude/plugins/cache/refract/refract/3.0.8/shared/journal-template.md`

Role boundary: You are the phase implementer, not Coordinator. Edit code only in `/home/ngosi/projects/scene-flow-gallery`; write phase records only under `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-01/`. Leave Coordinator skills and Refract job submission to the Coordinator.

## Response Format
Append the complete `# EXTERNAL RESPONSE` block to `/home/ngosi/projects/scene-flow-gallery/docs/plans/video-showcase-site/phase-01/journal.md`, then return that block and the matching status line from `erp.md`.

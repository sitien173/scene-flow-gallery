<!-- refract-shared-version: 3.0.8 -->

# Phase 1 Decision Notes

<!-- Created by the worker per worker-contract.md. Append one `## Task <M>` block per task. -->

## Task 1

### Decisions made
- Verified setup through ctx7 before running any generator. Libraries: Next.js (`/vercel/next.js`, docs for `v16.2.9`), shadcn/ui (`/shadcn-ui/ui`), Tailwind CSS (`/tailwindlabs/tailwindcss.com`), Biome (`/biomejs/biome`), and Vitest (`/vitest-dev/vitest`). Each question used 2 ctx7 commands (library, docs).
- Scaffolded with `create-next-app@latest` into `/tmp/sfg-scaffold`, outside the repo. Copied only the declared files into the repo. Generated `AGENTS.md`, `README.md`, `public/`, `eslint.config.mjs`, `pnpm-workspace.yaml`, and `components/ui/button.tsx` were not copied.
- Removed `eslint`, `eslint-config-next`, and the scaffold's `@tailwindcss/turbopack`. `postcss.config.mjs` is a declared file, so `@tailwindcss/postcss` is the Tailwind plugin path.
- Ran `shadcn init --base base --preset nova --template next` in the scaffold. Result: `components.json` style `base-nova`; `lib/utils.ts` is `export { cn } from "cn"`. The `cn` package is a dependency.
- `package.json` scripts: `dev`, `build`, `lint` (`biome check .`), `format` (`biome format --write .`), `test` (`vitest run`). The scaffold `start` script was not kept.
- `biome.json`: `files.includes` excludes `.agents`, `.claude`, and `docs`. Enabled `css.parser.tailwindDirectives` (option path confirmed in `node_modules/@biomejs/biome/configuration_schema.json`). Two-space indentation to match the scaffold.
- `app/layout.tsx` and `app/page.tsx` are minimal in this task. Font loading is Task 3.
- `next-env.d.ts` was rewritten by `next build` to add `import "./.next/types/root-params.d.ts";`. The generated version is kept.

### Spec deviations
- `package.json` has `"type": "module"`, which the spec does not list. Reason: without it Vitest 5 loads `vitest.config.ts` as CommonJS and prints an ESM warning. Renaming the config would break the declared filename.
- `pnpm install --frozen-lockfile` was run as `pnpm install --frozen-lockfile --ignore-workspace`. Reason: see Follow-ups. Same lockfile and install.
- `pnpm build` GREEN was recorded in this task before `next.config.ts` exists (Task 2). The build uses Next's default output here.

### Tradeoffs accepted
- Biome does not lint or format `.agents/`, `.claude/`, or `docs/`. Those trees are agent tooling and coordinator records.
- Scaffold pins kept: `next` 16.4.6, `react` and `react-dom` 19.3.0, `tailwindcss` 4.3.5. Newer `react` 19.3.1 exists; not bumped.
- `shadcn` CLI stays in `dependencies`, as the shadcn init wrote it.

### Assumptions
- The scaffold and shadcn outputs match the ctx7 docs for the flags used: `--base base`, `--preset nova`, `--template next`.

### Follow-ups for human
- `/home/ngosi/pnpm-workspace.yaml` (home-level, not modified) makes pnpm treat `/home/ngosi` as the workspace root. A plain `pnpm install` in the repo prints "Already up to date" and installs nothing. Repo commands here use `--ignore-workspace` for install. Owner decision: scope or move that file.
- `next build` warns that it ignores `/home/ngosi/pnpm-workspace.yaml`. Same cause.
- `pnpm` with no `package.json` falls back to the Android SDK `lint` binary on PATH (`/home/ngosi/Android/Sdk/cmdline-tools/latest/bin/lint`). Only affects commands run before scripts exist.

### Test evidence
- RED -> GREEN:
  - RED: `pnpm lint` (repo, before `package.json` existed) -> exit 2; output is the Android SDK `lint` usage text. No pnpm script matched, so the failure is a missing script, not a Biome assertion. Not a behavioral RED in the strict sense; recorded as the spec requires.
  - RED: `pnpm build` (repo, before config existed) -> exit 1 `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "build" not found`.
  - RED (behavioral, intermediate): `pnpm lint` after scripts were added but before `biome.json` excluded `.agents`/`docs` -> exit 1, `Checked 153 files`, `Found 141 errors`, Markdown formatting diagnostics. Fixed by the `files.includes` change.
  - RED (behavioral, intermediate): `pnpm lint` after the scope fix -> exit 1, `app/globals.css:125:6 parse`, "Tailwind-specific syntax is disabled", 6 errors. Fixed by `css.parser.tailwindDirectives: true`.
  - RED (behavioral, intermediate): `pnpm test` -> exit 0 with warning "ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1)". Fixed by `"type": "module"`.
  - RED (behavioral, intermediate): `pnpm lint` -> exit 1, `app/globals.css format`, missing trailing newline. Fixed with `pnpm exec biome format --write app/globals.css`.
  - GREEN: `pnpm lint` -> exit 0, `Checked 10 files in 5ms. No fixes applied.`
  - GREEN: `pnpm test` -> exit 0, `No test files found, exiting with code 0`. No ESM warning.
  - GREEN: `pnpm build` -> exit 0, `Compiled successfully`, route `/` `(Static)`.
- Root cause (bugfix only): none.

## Task 2

### Decisions made
- `next.config.ts` written as specified: `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`. Scaffold keys dropped (`cacheComponents`, `partialPrefetching`, and the `@tailwindcss/turbopack` loader that Task 1 removed).
- Config options confirmed against ctx7 Next.js docs (`/vercel/next.js/v16.2.9`): `images.unoptimized`, `trailingSlash` with `output: "export"`.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- none

### Follow-ups for human
- none

### Test evidence
- RED -> GREEN:
  - RED: `(pnpm build >/tmp/sfg-t2-red.log 2>&1 && test -f out/index.html)` -> exit 1; `out` directory absent. Build passed with default output; the export file was missing.
  - GREEN: `rm -rf out .next && (pnpm build && test -f out/index.html)` -> exit 0; `out/index.html` and `out/404.html` present; route `/` `(Static)  prerendered as static content`.
- Root cause (bugfix only): none

## Task 3

### Decisions made
- `components.json` and `lib/utils.ts` copied from the shadcn init output. `components.json` style `base-nova` (Base UI primitives, `base` base, `nova` preset).
- `lib/utils.ts` is shadcn's current one-line form, `export { cn } from "cn"`. The `cn` package is a declared dependency.
- `app/layout.tsx` loads Be Vietnam Pro with `variable: "--font-sans"` and `subsets: ["latin", "vietnamese"]`. The variable name matches the shadcn `globals.css` `@theme inline` entry `--font-sans: var(--font-sans)`.
- `weight: ["400", "500", "600", "700"]` added. Reason: `next build` failed with `Missing weight for Be Vietnam Pro. Available weights: 100, 200, 300, 400, 500, 600, 700, 800, 900`. The spec does not name weights. Chosen to cover Tailwind `font-normal`, `font-medium`, `font-semibold`, and `font-bold`. Design review recommended.
- `app/page.tsx` is a placeholder `<h1>` only.
- The shadcn-generated `components/ui/button.tsx` was not copied (not in the declared file set).

### Spec deviations
- none beyond the weight choice above, which the spec left open.

### Tradeoffs accepted
- Four static weights loaded. Each adds a font file to the output. Reduce if the design needs fewer.

### Assumptions
- The shadcn `base-nova` style and the `cn` helper are the intended shadcn/ui on Base UI setup.

### Follow-ups for human
- `app/globals.css` line `--font-mono: var(--font-geist-mono);` is shadcn-generated. No layout defines `--font-geist-mono` now that Geist is removed, so the mono token resolves to the browser default. Left as generated. Decide whether to map it to a loaded mono font or remove it (Phase 1 does not load a mono font).
- `weight` choice above needs design sign-off.

### Test evidence
- RED -> GREEN:
  - RED: `grep -rl "Be Vietnam Pro" out/` -> exit 1, no match (font absent from output).
  - RED: `test -f components.json && grep -q '"style": "base-nova"' components.json` -> exit 1. Failure is a missing file, not a content assertion.
  - RED: `test -f lib/utils.ts` -> exit 1. Missing file.
  - RED (behavioral, intermediate): `pnpm build` with `Be_Vietnam_Pro` and no weight -> exit 1, `Missing weight for Be Vietnam Pro`. Fixed by the `weight` array.
  - GREEN: `pnpm build` -> exit 0, `Compiled successfully`. `grep -rl "Be Vietnam Pro" out/` -> exit 0; `font-family:Be Vietnam Pro` present in `out/_next/static/`.
  - GREEN: `grep -q '"style": "base-nova"' components.json` -> exit 0.
  - GREEN: `node --input-type=module -e "const m = await import('cn'); ..."` -> `cn type: function | merged: a b`.
  - GREEN: `pnpm exec tsc --noEmit` -> exit 0.
  - GREEN: `node_modules/@base-ui/react/package.json` -> version `1.9.0`.
- Root cause (bugfix only): none

## Task 4

### Decisions made
- `.gitignore` written with the exact list from the spec, in the spec order.
- `.env.example` written with the two keys from the spec.
- `tsconfig.tsbuildinfo` created by `tsc --noEmit` (the scaffold has `incremental: true`) was deleted. It is a generator artifact outside the file set.

### Spec deviations
- none

### Tradeoffs accepted
- none

### Assumptions
- `git check-ignore` evaluates patterns for paths that do not exist on disk. This is the standard behavior for that command.

### Follow-ups for human
- `tsconfig.json` has `incremental: true`. Running `tsc` writes `tsconfig.tsbuildinfo` at the repository root. That file is not covered by the spec's `.gitignore` list. Decide whether to add `*.tsbuildinfo` to `.gitignore`. Not added here, since the spec lists the exact entries.

### Test evidence
- RED -> GREEN:
  - RED: `git check-ignore -q .env; echo $?` -> exit 1 (not ignored). `git check-ignore -q .env.example` -> exit 1. `git check-ignore -q node_modules/` -> exit 1.
  - GREEN: `git check-ignore .env` -> prints `.env`, exit 0 (ignored by `.gitignore:7:.env*`).
  - GREEN: `git check-ignore .env.example` -> no output, exit 1 (not ignored; re-included by `.gitignore:8:!.env.example`).
  - GREEN: `git check-ignore .env.local` -> prints `.env.local`, exit 0.
- Root cause (bugfix only): none

## Fresh Done When checks

- `pnpm install --frozen-lockfile --ignore-workspace` -> exit 0, `Already up to date`.
- `pnpm lint` -> exit 0, `Checked 13 files in 6ms. No fixes applied.`
- `pnpm test` -> exit 0, `No test files found, exiting with code 0`.
- `pnpm build && test -f out/index.html` -> exit 0, `Compiled successfully`, `out/index.html` 7305 bytes.
- `grep -ci eslint package.json pnpm-lock.yaml` -> `0` and `0`. `ls eslint.config.*` -> no match.
- Versions: `next@16.4.6`, `react@19.3.0`, `tailwindcss@4.3.5`, `@tailwindcss/postcss@4.3.5`.

# Gallery Brand Redesign Design

**Status:** Confirmed 2026-11-18
**Consultation:** consult job 2cc26983-5967-4ff7-9b8f-d5d777ba99eb (anthropic) recommended restyling in place; its findings on tokens, orphaned files, contrast, sorting, and test impact are adopted below.

## Purpose

Make the gallery read as the Góc Nhìn Mở channel site. The published videos use navy `#16264A`, amber `#FEAB24`, Be Vietnam Pro, and Vietnamese narration. The current site is stock shadcn grayscale on white with English UI, so the videos look pasted onto a template.

## Users and Success Criteria

Users: Vietnamese-speaking viewers of the Góc Nhìn Mở channel, on phones first.

Success criteria:

- `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass.
- Screenshots at 390px and 1280px wide, home and video page, rendered with the three real videos from `/home/ngosi/projects/tiktok-gocnhinmo/publish/`, show the brand applied. Baseline: `/tmp/sfg-home.png`, `/tmp/sfg-detail.png`, `/tmp/sfg-mobile.png`.

## Constraints, Invariants, and Non-Goals

Constraints:

- Navy dark scheme only.
- All UI text Vietnamese; `<html lang="vi">`.
- No new dependencies.

Invariants:

- Static export (`output: "export"`, `trailingSlash: true`).
- Manifest schema and validation in `lib/videos.ts`, including the `theme` field.
- `getVideos` returns manifest order; `lib/videos.test.ts` stays unchanged.
- JSON-LD, `generateMetadata`, sitemap, robots.
- `/v/<slug>/` URLs and the `_none` empty-manifest route.
- Hover preview guards: `(hover: none)` and `prefers-reduced-motion: reduce`.
- Video fallback behavior: a failed video shows a status message instead of the player.

Non-goals:

- Light mode or a theme toggle.
- Topic tags, search, or any filtering.
- Changes to `scripts/prepare-video.sh`.
- Adding the real videos to `content/videos.json` or uploading to R2.
- Removing `@base-ui/react` or `class-variance-authority` from `package.json`, although they lose all importers.

## Chosen Approach

Restyle in place. Replace the shadcn tokens with one navy token set, delete the filter and the UI components it alone used, simplify the home grid to a server list, and re-lay out the video page.

Rejected:

- Minimal reskin keeping filter code unused: leaves dead code contradicting the decision to remove the filter.
- Separate `.brand` class over shadcn tokens: keeps dead light and dark tokens and two sources of truth.
- Sorting inside `getVideos`: breaks `lib/videos.test.ts:16-36` and validation errors would cite sorted positions.
- `next/image` for the logo: no benefit with `images.unoptimized: true`.
- Formatting dates in a client component: hydration-mismatch risk.

## Architecture and Data Flow

Theme, `app/globals.css`:

- Navy tokens in `:root`: background `#16264A`, card and muted surface `#1F3360`, foreground near-white, muted-foreground `#B8C2D9`, primary and ring amber `#FEAB24`, primary-foreground navy, border white at 10%.
- Delete the `.dark` block. Keep `@custom-variant dark`.
- Base focus outline uses solid amber, not `ring/50`. At 50% alpha, amber on navy is 2.92:1 and fails WCAG non-text contrast.

Layout, `app/layout.tsx`:

- `<html lang="vi" className="dark ...">`.
- `export const viewport = { colorScheme: "dark", themeColor: "#16264A" }`.

Home, `app/page.tsx`:

- `<h1>` contains the logo `<img src="/brand/c1-lockup-white.webp" width={899} height={200} alt="Góc Nhìn Mở">`, copied from `/home/ngosi/projects/tiktok-gocnhinmo/brand/logos/c1-lockup-white.webp` to `public/brand/`.
- Videos sorted with `toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt))`. Ties keep manifest order.
- No `Suspense`. Padding `p-4` on phones, `p-8` from `sm`.
- Empty state: `Chưa có video nào.`

Grid, `components/video-grid.tsx`:

- Server component exporting the card list only. `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, `gap-3` on phones, `gap-6` from `sm`.
- `parseTheme`, `useSearchParams`, `useRouter`, `usePathname`, the count, and the "no match" branch are removed.

Card, `components/video-card.tsx`:

- Poster box background black.
- Duration pill bottom-right over the poster, `bg-black/60 text-white`, tabular numbers.
- Title below the poster, 2-line clamp, `leading-normal` so Vietnamese diacritics do not clip.
- Badge and `THEME_FILTERS` usage removed. Hover preview logic unchanged.

Video page, `app/v/[slug]/page.tsx`:

- Container `max-w-5xl`. From `md`: two columns, player left, details right. Below `md`: stacked, player first.
- Player width capped at `calc((100svh - 8rem) * 9 / 16)`.
- Right column: back link `← Tất cả video`, `<h1>` title, meta line `<date> · <duration>`, section `Lời thoại` with the transcript.
- Date: `toLocaleDateString("vi-VN", { dateStyle: "long", timeZone: "UTC" })`, for example `18 tháng 11, 2026`. Runs in the server component only.
- Footer note, small muted text: `Người tạo`, `Giọng đọc`, `Quay màn hình: có | không`, `Ghi chú` when notes exist. Creator link behavior unchanged.
- `VOICE_LABELS`: `Tự thu âm`, `TTS API`, `VieNeu-TTS`.
- JSON-LD and metadata unchanged.

Player, `components/video-player.tsx`:

- `ThemeBadge` removed. Background black.
- Fallback text `Không phát được video`.

Deleted files:

- `components/theme-filter.tsx`
- `components/ui/toggle.tsx`
- `components/ui/toggle-group.tsx`
- `components/ui/badge.tsx`

## Errors and Edge Cases

- Poster fails to load: black tile; duration pill and title still render.
- Video fails to load: `Không phát được video` status in place of the player.
- Empty manifest: `Chưa có video nào.`; `_none` route behavior unchanged.
- Old `?theme=<value>` links: the query is ignored and all videos show.
- Equal `publishedAt`: manifest order.
- Tall viewport-limited desktop: player width cap keeps the whole player visible.

## Migration

No data migration. README updates:

- `README.md:3`: remove the theme-filtering sentence.
- `README.md:44`, "Add a video" step 2: recommend poster time `0`, because frame 0 carries no caption.
- `README.md:128`: empty-state text becomes `Chưa có video nào.`

## Testing

`e2e/smoke.spec.ts`:

- Remove the `3 videos` count assertion, the filter test, and the unknown-theme test.
- Add: card hrefs in newest-first order for the fixture: `/v/tour-world3d/`, `/v/paper-overview/`, `/v/intro-dark/`.
- Add: `/?theme=paper` shows all 3 cards.
- Home `<h1>` accessible name `Góc Nhìn Mở`.
- Transcript heading `Lời thoại`.
- Fallback text `Không phát được video`.
- Remove theme-label assertions and the `theme` field from the `FixtureVideo` type.

`lib/videos.test.ts`: unchanged.

Visual check: rebuild with the preview manifest `/tmp/sfg-preview.json` (`NEXT_PUBLIC_MEDIA_HOST=localhost`, media on `127.0.0.1:8788`) and screenshot home and one video page at 390px and 1280px.

## Risks and Open Questions

- Vietnamese UI copy was drafted by the assistant and needs review by a native speaker.
- Date text on Cloudflare Pages depends on that build image's Node ICU data. Not verified.
- `next dev` writes `AGENTS.md` and rewrites `next-env.d.ts`; do not commit either as part of this plan unless the user decides to.

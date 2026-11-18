"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  THEME_FILTERS,
  ThemeFilter,
  type ThemeFilterValue,
} from "@/components/theme-filter";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/videos";

export function parseTheme(raw: string | null): ThemeFilterValue {
  return THEME_FILTERS.find((filter) => filter.value === raw)?.value ?? "all";
}

function CardList({ videos }: { videos: Video[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 min-[769px]:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <li key={video.slug}>
          <VideoCard video={video} />
        </li>
      ))}
    </ul>
  );
}

// Rendered as the Suspense fallback so the static HTML contains every card link.
export function VideoGridFallback({ videos }: { videos: Video[] }) {
  return <CardList videos={videos} />;
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const theme = parseTheme(searchParams.get("theme"));
  const visible =
    theme === "all" ? videos : videos.filter((video) => video.theme === theme);

  function selectTheme(next: ThemeFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("theme");
    else params.set("theme", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  const themeLabel = THEME_FILTERS.find(
    (filter) => filter.value === theme,
  )?.label;
  const count = `${visible.length} ${visible.length === 1 ? "video" : "videos"}`;

  return (
    <section className="mt-6 flex flex-col gap-6">
      <ThemeFilter value={theme} onChange={selectTheme} />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {theme === "all" ? count : `${count} in ${themeLabel}`}
      </p>
      {visible.length > 0 ? (
        <CardList videos={visible} />
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p>No videos match this theme.</p>
          <button
            type="button"
            onClick={() => selectTheme("all")}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Show all
          </button>
        </div>
      )}
    </section>
  );
}

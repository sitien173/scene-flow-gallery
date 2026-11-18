import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

type FixtureVideo = {
  slug: string;
  title: string;
  durationSec: number;
  script: string;
};

const fixture = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/videos.json", import.meta.url),
    "utf8",
  ),
) as FixtureVideo[];

function bySlug(slug: string): FixtureVideo {
  const video = fixture.find((entry) => entry.slug === slug);
  if (!video) throw new Error(`no fixture video "${slug}"`);
  return video;
}

// Media requests are answered locally so nothing leaves the machine.
test.beforeEach(async ({ page }) => {
  await page.route("**/media.example.com/**", (route) =>
    route.fulfill({ status: 404 }),
  );
});

// Card links are matched by href because no ARIA role or name query can select
// on href. The link is still the element a user tabs to and activates.
// <video> has no ARIA role either, so video elements are located by tag.
function cards(page: Page) {
  return page.locator('a[href^="/v/"]');
}

test("grid shows three cards", async ({ page }) => {
  await page.goto("/");
  const links = cards(page);
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /^\/v\/[a-z0-9-]+\/$/);
  }
  const hrefs = await links.evaluateAll((els) =>
    els.map((el) => el.getAttribute("href")),
  );
  expect(hrefs).toEqual([
    "/v/tour-world3d/",
    "/v/paper-overview/",
    "/v/intro-dark/",
  ]);
});

test("old theme query shows all cards", async ({ page }) => {
  await page.goto("/?theme=paper");
  await expect(cards(page)).toHaveCount(3);
});

test.describe("video page", () => {
  // Hold the mp4 request open. A 404 would unmount the player and show
  // "Không phát được video", which the broken-video test covers.
  test.beforeEach(async ({ page }) => {
    await page.route(/media\.example\.com\/.*\.mp4$/, () => {});
  });

  test("card opens the video page", async ({ page }) => {
    const intro = bySlug("intro-dark");
    await page.goto("/");
    await page.getByRole("link", { name: intro.title }).click();
    await expect(page).toHaveURL(/\/v\/intro-dark\/$/);
    await expect(page.locator("video")).toHaveAttribute("controls", "");
    await expect(
      page.getByRole("link", { name: "Tất cả video" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lời thoại", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(intro.script, { exact: true })).toBeVisible();
  });

  test("desktop puts the whole player beside the details", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/v/intro-dark/");
    const player = await page.locator("video").boundingBox();
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(player && title).toBeTruthy();
    if (!player || !title) return;
    expect(player.y + player.height).toBeLessThanOrEqual(720);
    expect(title.x).toBeGreaterThanOrEqual(player.x + player.width);
  });

  test("phone stacks the details under the player", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/v/intro-dark/");
    const player = await page.locator("video").boundingBox();
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(player && title).toBeTruthy();
    if (!player || !title) return;
    expect(title.y).toBeGreaterThanOrEqual(player.y + player.height);
  });

  test("no autoplay", async ({ page }) => {
    await page.goto("/v/intro-dark/");
    const video = page.locator("video");
    await expect(video).toBeAttached();
    await expect(video).not.toHaveAttribute("autoplay");
    await expect(video).toHaveJSProperty("paused", true);
  });
});

test("hover preview mounts and unmounts", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("link", { name: bySlug("intro-dark").title });
  await card.hover();
  // Checked as DOM properties, so the result does not depend on whether React also writes the attribute.
  const preview = card.locator("video");
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveJSProperty("muted", true);
  await expect(preview).toHaveJSProperty("loop", true);
  await page.getByRole("heading", { level: 1, name: "Góc Nhìn Mở" }).hover();
  await expect(preview).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion never mounts a preview", async ({ page }) => {
    await page.goto("/");
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    const card = page.getByRole("link", { name: bySlug("intro-dark").title });
    await card.hover();
    // Bounded wait, well under 500 ms, so a preview that would mount has time to appear.
    await page.waitForTimeout(300);
    await expect(card.locator("video")).toHaveCount(0);
  });
});

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("touch device never mounts a preview", async ({ page }) => {
    await page.goto("/");
    const noHover = await page.evaluate(
      () => matchMedia("(hover: none)").matches,
    );
    test.skip(
      !noHover,
      "Chromium does not report (hover: none) with hasTouch and isMobile in this run",
    );
    const card = page.getByRole("link", { name: bySlug("intro-dark").title });
    for (let press = 0; press < 10; press++) {
      if (await card.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(card).toBeFocused();
    await page.waitForTimeout(300);
    await expect(card.locator("video")).toHaveCount(0);
  });
});

// Mirrors formatDuration in components/video-card.tsx.
function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

test("broken poster keeps text visible", async ({ page }) => {
  await page.route(/media\.example\.com\/.*\.webp$/, (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/");
  for (const video of fixture) {
    const card = page.getByRole("link", { name: video.title });
    await expect(card.getByText(video.title, { exact: true })).toBeVisible();
    await expect(
      card.getByText(formatDuration(video.durationSec), { exact: true }),
    ).toBeVisible();
  }
});

test("broken video shows Không phát được video", async ({ page }) => {
  await page.route(/media\.example\.com\/.*\.(mp4|webp)$/, (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/v/intro-dark/");
  await expect(page.getByRole("status")).toHaveText("Không phát được video");
  await expect(page.locator("video")).toHaveCount(0);
});

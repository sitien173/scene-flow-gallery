import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getVideo, getVideos, parseVideos } from "./videos";

const FIXTURE_PATH = resolve(process.cwd(), "tests/fixtures/videos.json");

function loadFixture(): Record<string, unknown>[] {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getVideos", () => {
  it("loads the fixture manifest with three entries", () => {
    vi.stubEnv("VIDEOS_MANIFEST", FIXTURE_PATH);

    const videos = getVideos();

    expect(videos).toHaveLength(3);
    expect(videos.map((video) => video.theme)).toEqual([
      "dark",
      "paper",
      "world3d",
    ]);
  });

  it("selects the manifest file named by VIDEOS_MANIFEST", () => {
    vi.stubEnv("VIDEOS_MANIFEST", FIXTURE_PATH);

    expect(getVideos().map((video) => video.slug)).toEqual(
      loadFixture().map((video) => video.slug),
    );
  });
});

describe("parseVideos", () => {
  it("accepts an empty array", () => {
    expect(parseVideos([])).toEqual([]);
  });

  it("rejects a duplicate slug and names the entry index and field", () => {
    const entries = loadFixture();
    entries[1].slug = entries[0].slug;

    expect(() => parseVideos(entries)).toThrow(/^videos\[1\]\.slug: /);
  });

  it("rejects an invalid slug and names the entry index and field", () => {
    const entries = loadFixture();
    entries[0].slug = "Bad Slug";

    expect(() => parseVideos(entries)).toThrow(/^videos\[0\]\.slug: /);
  });

  it("rejects a videoUrl on a foreign host and names the entry index and field", () => {
    const entries = loadFixture();
    entries[2].videoUrl = "https://cdn.other.test/v/tour-world3d-v1.mp4";

    expect(() => parseVideos(entries)).toThrow(/^videos\[2\]\.videoUrl: /);
  });

  it("rejects a posterUrl on a foreign host and names the entry index and field", () => {
    const entries = loadFixture();
    entries[0].posterUrl = "https://cdn.other.test/v/intro-dark-poster.webp";

    expect(() => parseVideos(entries)).toThrow(/^videos\[0\]\.posterUrl: /);
  });

  it("rejects a missing script and names the entry index and field", () => {
    const entries = loadFixture();
    delete entries[1].script;

    expect(() => parseVideos(entries)).toThrow(/^videos\[1\]\.script: /);
  });

  it("rejects a whitespace-only title and names the entry index and field", () => {
    const entries = loadFixture();
    entries[2].title = "   ";

    expect(() => parseVideos(entries)).toThrow(/^videos\[2\]\.title: /);
  });

  it("rejects a whitespace-only script and names the entry index and field", () => {
    const entries = loadFixture();
    entries[1].script = " \n\t ";

    expect(() => parseVideos(entries)).toThrow(/^videos\[1\]\.script: /);
  });

  it("rejects a lookalike host that only starts with the media host", () => {
    const entries = loadFixture();
    entries[0].videoUrl = "https://media.example.com.evil.test/x.mp4";

    expect(() => parseVideos(entries)).toThrow(/^videos\[0\]\.videoUrl: /);
  });

  it("rejects a non-URL videoUrl with an entry index and field message", () => {
    const entries = loadFixture();
    entries[0].videoUrl = "not a url";

    expect(() => parseVideos(entries)).toThrow(/^videos\[0\]\.videoUrl: /);
  });

  it("reads NEXT_PUBLIC_MEDIA_HOST when validating", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_HOST", "cdn.test");
    const entries = loadFixture();
    for (const entry of entries) {
      entry.videoUrl = String(entry.videoUrl).replace(
        "media.example.com",
        "cdn.test",
      );
      entry.posterUrl = String(entry.posterUrl).replace(
        "media.example.com",
        "cdn.test",
      );
    }

    expect(parseVideos(entries)).toHaveLength(3);
  });
});

describe("parseVideos lang", () => {
  it.each([
    "vi",
    "en",
    "en-US",
    "zh-Hant-TW",
    "de-CH-1901",
    "sgn-BE-FR",
    "x-private",
    "i-klingon",
    "en-GB-oed",
    "zh-min-nan",
  ])("accepts the BCP 47 tag %s", (lang) => {
    const entries = loadFixture();
    entries[0].lang = lang;

    expect(() => parseVideos(entries)).not.toThrow();
  });

  it.each(["", "not a lang!", "en_US", "a", "en-", "x-"])(
    "rejects the non-BCP 47 value %j and names the entry index and field",
    (lang) => {
      const entries = loadFixture();
      entries[0].lang = lang;

      expect(() => parseVideos(entries)).toThrow(/^videos\[0\]\.lang: /);
    },
  );
});

describe("getVideo", () => {
  it("returns the entry for a known slug", () => {
    vi.stubEnv("VIDEOS_MANIFEST", FIXTURE_PATH);

    expect(getVideo("paper-overview")?.theme).toBe("paper");
  });

  it("returns undefined for an unknown slug", () => {
    vi.stubEnv("VIDEOS_MANIFEST", FIXTURE_PATH);

    expect(getVideo("does-not-exist")).toBeUndefined();
  });
});

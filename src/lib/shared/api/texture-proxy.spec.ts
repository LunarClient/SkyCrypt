import { describe, it, vi } from "vitest";

vi.mock("$env/dynamic/public", () => ({
  env: {
    PUBLIC_API_URL: "https://sky.shiiyu.moe/api/",
    PUBLIC_SERVER_API_URL: "http://backend:8080/api/"
  }
}));

const { proxyApiAssetUrls, unproxyApiAssetUrls } = await import("./texture-proxy");

describe("proxyApiAssetUrls", () => {
  it("rewrites nested API asset URLs to the texture proxy", ({ expect }) => {
    const data = {
      texture_path: "https://sky.shiiyu.moe/api/item/FLAMEBREAKER_LEGGINGS",
      pets: [{ texture: "http://backend:8080/api/head/abc" }],
      texture: "https://sky.shiiyu.moe/cache/rendered/x.webp",
      other: "https://example.com/api/item/X",
      level: 5
    };

    expect(proxyApiAssetUrls(data)).toEqual({
      texture_path: "/textures/api/item/FLAMEBREAKER_LEGGINGS",
      pets: [{ texture: "/textures/api/head/abc" }],
      texture: "/textures/cache/rendered/x.webp",
      other: "https://example.com/api/item/X",
      level: 5
    });
  });

  it("leaves non-plain objects untouched", ({ expect }) => {
    const blob = new Blob(["png"]);
    expect(proxyApiAssetUrls(blob)).toBe(blob);
  });
});

describe("unproxyApiAssetUrls", () => {
  it("points proxied markup back at the server API origin", ({ expect }) => {
    expect(unproxyApiAssetUrls('<img src="/textures/api/item/X">')).toBe('<img src="http://backend:8080/api/item/X">');
  });
});

import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../../next.config";

describe("security headers", () => {
  it.each(["/", "/api/lesson", "/nested/page", "/_next/static/chunk.js"])("applies the security headers to %s", async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: `https://example.test${path}`, nextConfig });
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(response.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });
});

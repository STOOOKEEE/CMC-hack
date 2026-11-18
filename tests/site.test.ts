import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site";

describe("siteUrl", () => {
  it("falls back to localhost when SITE_URL is empty or missing", () => {
    expect(siteUrl({ SITE_URL: "" }).href).toBe("http://localhost:3000/");
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
  });

  it("adds https:// to a bare host name", () => {
    expect(siteUrl({ SITE_URL: " wrapscout.up.railway.app " }).href).toBe("https://wrapscout.up.railway.app/");
  });

  it("keeps a full URL", () => {
    expect(siteUrl({ SITE_URL: "https://wrapscout.example.com" }).href).toBe("https://wrapscout.example.com/");
  });

  it("uses the host's public domain when SITE_URL is unset", () => {
    expect(siteUrl({ RAILWAY_PUBLIC_DOMAIN: "ws.up.railway.app" }).href).toBe("https://ws.up.railway.app/");
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ws.vercel.app" }).href).toBe("https://ws.vercel.app/");
  });

  it("never throws on garbage", () => {
    expect(siteUrl({ SITE_URL: "http://" }).href).toBe("http://localhost:3000/");
  });
});

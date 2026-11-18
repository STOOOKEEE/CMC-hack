const LOCAL = "http://localhost:3000";

function parse(value: string | undefined): URL | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

/**
 * Public base URL for share-image links. Never throws: an empty or malformed SITE_URL must not
 * take the whole site down. Falls back to the host's public domain, then localhost.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): URL {
  return (
    parse(env.SITE_URL) ??
    parse(env.RAILWAY_PUBLIC_DOMAIN) ??
    parse(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    new URL(LOCAL)
  );
}

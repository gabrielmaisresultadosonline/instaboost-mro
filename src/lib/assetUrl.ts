// Resolves Lovable asset pointer URLs to absolute URLs so they work
// when the app is self-hosted (VPS) outside of *.lovable.app.
// Lovable-hosted paths start with "/__l5e/" and are proxied by Lovable's CDN.
const LOVABLE_CDN_ORIGIN = "https://ig-mro-boost.lovable.app";

export function assetUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/__l5e/")) {
    if (typeof window !== "undefined" && window.location.hostname.endsWith(".lovable.app")) {
      return url; // same-origin on Lovable
    }
    return `${LOVABLE_CDN_ORIGIN}${url}`;
  }
  return url;
}

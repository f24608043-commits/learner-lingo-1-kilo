/**
 * Parses a YouTube video ID from multiple URL formats.
 * Accepted: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, raw 11-char ID.
 * Per FR9.1a.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // /embed/ID
      const match = u.pathname.match(/\/embed\/([^/?&]+)/);
      if (match) return match[1];
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0];
    }
  } catch {
    // Not a valid URL — try raw 11-char video ID fallback
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  }
  return null;
}

/**
 * Sanitize a URL to prevent XSS via javascript: or data: protocol injection.
 * Returns the URL if it uses http/https, otherwise returns "#".
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return "#";
}

/**
 * Ensures a URL has a protocol prefix. If not, prepends https://.
 * Then validates it's a safe URL.
 */
export function ensureProtocol(url: string | undefined | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed}`;
  }
  return "#";
}

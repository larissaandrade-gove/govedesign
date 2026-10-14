/** Server-only helpers for the public redirect route. */

export function parseUserAgent(ua: string | null) {
  if (!ua) {
    return {
      device_type: null as string | null,
      browser: null as string | null,
      operating_system: null as string | null,
    };
  }

  const s = ua.toLowerCase();

  const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s);
  const isMobile = /iphone|ipod|android.*mobile|windows phone|mobile safari|opera mini/.test(s);
  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp/.test(s);
  const device_type = isBot ? "bot" : isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser: string | null = null;
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/chrome\//.test(s) && !/chromium/.test(s)) browser = "Chrome";
  else if (/chromium/.test(s)) browser = "Chromium";
  else if (/firefox\//.test(s)) browser = "Firefox";
  else if (/safari\//.test(s) && !/chrome/.test(s)) browser = "Safari";

  let operating_system: string | null = null;
  if (/windows nt/.test(s)) operating_system = "Windows";
  else if (/iphone|ipad|ipod|ios/.test(s)) operating_system = "iOS";
  else if (/mac os x|macintosh/.test(s)) operating_system = "macOS";
  else if (/android/.test(s)) operating_system = "Android";
  else if (/linux/.test(s)) operating_system = "Linux";

  return { device_type, browser, operating_system };
}

/**
 * Geo data comes from edge headers when available (Cloudflare). We never guess:
 * anything missing is stored as NULL. No IP address or personal data is stored.
 */
export function readGeoHeaders(headers: Headers) {
  const get = (name: string) => {
    const value = headers.get(name);
    return value && value.trim() && value !== "XX" ? value.trim() : null;
  };
  return {
    country: get("cf-ipcountry") ?? get("x-vercel-ip-country"),
    region: get("cf-region") ?? get("x-vercel-ip-country-region"),
    city: get("cf-ipcity") ?? get("x-vercel-ip-city"),
  };
}

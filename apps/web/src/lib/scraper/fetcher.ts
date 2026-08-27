// SSRF-safe HTTP fetcher used by the scraper pipeline.
// Kept separate from the URL validator so other extractors can reuse it.

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 1024 * 1024; // 1 MiB per page.
const LOG = "[scraper]";

const DEFAULT_HEADERS = {
  // Present a browser-compatible UA (WAFs commonly 400/406 unknown UAs)
  // while identifying Raah in the token so operators can trace the request.
  "user-agent":
    "Mozilla/5.0 (compatible; RaahBot/1.0; +https://raah.local; institution-website-verification)",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
} as const;

export type FetchedPage = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  contentType: string | null;
  html: string;
  bytes: number;
  ok: boolean;
  error?: string;
  elapsedMs: number;
};

export function normalizeWebsiteUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validatePublicUrl(input: string):
  | { ok: true; url: URL }
  | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed" };
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".localhost")) {
    return { ok: false, error: "Localhost addresses are not allowed" };
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    ) {
      return { ok: false, error: "Private IP addresses are not allowed" };
    }
  }
  // IPv6 literal gating — hostname must actually be an IPv6 literal
  // (contains a colon). Domain names like "fcrit.ac.in" must not trip this.
  if (host.includes(":")) {
    if (
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80")
    ) {
      return { ok: false, error: "Private IPv6 addresses are not allowed" };
    }
  }
  if (
    host === "metadata.google.internal" ||
    host === "metadata" ||
    host === "instance-data"
  ) {
    return { ok: false, error: "Metadata endpoints are not allowed" };
  }
  return { ok: true, url };
}

export type FetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  extraHeaders?: Record<string, string>;
};

/**
 * Fetch one URL with hard timeout + byte cap. Returns a FetchedPage
 * regardless of success — inspect `ok` and `error`.
 */
export async function fetchPage(
  urlInput: string | URL,
  opts: FetchOptions = {}
): Promise<FetchedPage> {
  const requested = typeof urlInput === "string" ? urlInput : urlInput.toString();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  const validated = validatePublicUrl(requested);
  if (!validated.ok) {
    return {
      requestedUrl: requested,
      finalUrl: requested,
      status: 0,
      statusText: "invalid",
      contentType: null,
      html: "",
      bytes: 0,
      ok: false,
      error: validated.error,
      elapsedMs: 0,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  console.log(LOG, "fetch:start", {
    host: validated.url.host,
    path: validated.url.pathname,
  });

  try {
    const res = await fetch(validated.url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: { ...DEFAULT_HEADERS, ...(opts.extraHeaders ?? {}) },
    });
    const contentType = res.headers.get("content-type");
    const elapsedMs = Date.now() - started;
    console.log(LOG, "fetch:response", {
      host: validated.url.host,
      status: res.status,
      contentType,
      ms: elapsedMs,
    });
    if (!res.ok) {
      return {
        requestedUrl: requested,
        finalUrl: res.url || requested,
        status: res.status,
        statusText: res.statusText,
        contentType,
        html: "",
        bytes: 0,
        ok: false,
        error: `HTTP ${res.status} ${res.statusText || ""}`.trim(),
        elapsedMs,
      };
    }
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("xml")
    ) {
      return {
        requestedUrl: requested,
        finalUrl: res.url || requested,
        status: res.status,
        statusText: res.statusText,
        contentType,
        html: "",
        bytes: 0,
        ok: false,
        error: `Not an HTML response (${contentType})`,
        elapsedMs,
      };
    }
    const html = await readWithLimit(res, maxBytes, controller);
    return {
      requestedUrl: requested,
      finalUrl: res.url || requested,
      status: res.status,
      statusText: res.statusText,
      contentType,
      html,
      bytes: html.length,
      ok: true,
      elapsedMs: Date.now() - started,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fetch failed";
    const elapsedMs = Date.now() - started;
    console.log(LOG, "fetch:error", {
      host: validated.url.host,
      message,
      ms: elapsedMs,
    });
    return {
      requestedUrl: requested,
      finalUrl: requested,
      status: 0,
      statusText: "error",
      contentType: null,
      html: "",
      bytes: 0,
      ok: false,
      error: message,
      elapsedMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readWithLimit(
  res: Response,
  maxBytes: number,
  controller: AbortController
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  let received = 0;
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      controller.abort();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((c) => Buffer.from(c)))
  );
}

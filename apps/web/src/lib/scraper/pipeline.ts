// Reusable scrape pipeline: normalize → validate → fetch a whitelisted set
// of subpaths → hand pages to an extractor → cache the extractor's result.
//
// The pipeline is agnostic to what the extractor produces; the institution
// extractor is one consumer, but nothing here is institution-specific.

import type { ScrapeCache } from "./cache";
import {
  fetchPage,
  normalizeWebsiteUrl,
  validatePublicUrl,
  type FetchedPage,
  type FetchOptions,
} from "./fetcher";

const LOG = "[scraper]";

export type Extractor<T> = (pages: FetchedPage[]) => T;

export type ScrapeOptions<T> = {
  /** Bare URL or hostname; will be normalized to https://<host>. */
  startUrl: string;
  /** Relative paths to fetch from the site's origin. Deduplicated. */
  paths?: string[];
  /** Extractor that turns fetched pages into a structured result. */
  extract: Extractor<T>;
  /** Cache key. Omit to skip caching. Namespace with a prefix, e.g. "institution:host". */
  cacheKey?: string;
  cache?: ScrapeCache;
  cacheTtlHours?: number;
  fetchOptions?: FetchOptions;
};

export type ScrapeResult<T> = {
  cached: boolean;
  host: string;
  fetchedAt: string;
  pages: FetchedPage[];
  extracted: T;
};

const DEFAULT_PATHS = ["/", "/about", "/departments", "/research"];
const DEFAULT_TTL_HOURS = 24 * 7; // one week

/**
 * Run the scrape pipeline for a single site. Errors on individual paths
 * are surfaced through the returned FetchedPage[] rather than thrown.
 */
export async function scrapeSite<T>(opts: ScrapeOptions<T>): Promise<ScrapeResult<T>> {
  const normalized = normalizeWebsiteUrl(opts.startUrl);
  const check = validatePublicUrl(normalized);
  if (!check.ok) {
    const empty: FetchedPage = {
      requestedUrl: normalized,
      finalUrl: normalized,
      status: 0,
      statusText: "invalid",
      contentType: null,
      html: "",
      bytes: 0,
      ok: false,
      error: check.error,
      elapsedMs: 0,
    };
    return {
      cached: false,
      host: "",
      fetchedAt: new Date().toISOString(),
      pages: [empty],
      extracted: opts.extract([empty]),
    };
  }

  const host = check.url.host;

  // Cache short-circuit.
  if (opts.cache && opts.cacheKey) {
    const hit = await opts.cache.get<{
      fetchedAt: string;
      pages: FetchedPage[];
      extracted: T;
    }>(opts.cacheKey);
    if (hit) {
      console.log(LOG, "cache:hit", { key: opts.cacheKey, host });
      return {
        cached: true,
        host,
        fetchedAt: hit.fetchedAt,
        pages: hit.pages,
        extracted: hit.extracted,
      };
    }
  }

  const paths = dedupe(opts.paths?.length ? opts.paths : DEFAULT_PATHS).map(
    (p) => (p.startsWith("/") ? p : `/${p}`)
  );
  const origin = check.url.origin;

  const pages: FetchedPage[] = [];
  for (const path of paths) {
    const url = new URL(path, origin).toString();
    const page = await fetchPage(url, opts.fetchOptions);
    pages.push(page);
    // Stop chasing subpaths if the site is entirely unreachable.
    if (pages.length === 1 && !page.ok && page.status === 0) break;
  }

  const extracted = opts.extract(pages);
  const fetchedAt = new Date().toISOString();

  if (opts.cache && opts.cacheKey && pages.some((p) => p.ok)) {
    await opts.cache.set(
      opts.cacheKey,
      { fetchedAt, pages, extracted },
      opts.cacheTtlHours ?? DEFAULT_TTL_HOURS
    );
    console.log(LOG, "cache:set", { key: opts.cacheKey, host });
  }

  return { cached: false, host, fetchedAt, pages, extracted };
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

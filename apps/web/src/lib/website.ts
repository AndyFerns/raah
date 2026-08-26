// Institution-website analyzer.
//
// Thin wrapper over the generic scraper pipeline. Results are cached by
// hostname in public.scrape_cache so a second request for the same site
// short-circuits the network — that's the "don't scrape the same website
// again and again" behaviour the product asked for.

import {
  createSupabaseScrapeCache,
  extractInstitution,
  normalizeWebsiteUrl,
  scrapeSite,
  validatePublicUrl,
  type InstitutionExtraction,
} from "./scraper";
import type { WebsiteAnalysis } from "./supabase/types";

const INSTITUTION_PATHS = ["/", "/about", "/departments", "/research"];
const CACHE_TTL_HOURS = 24 * 7; // one week

// Re-exports so existing call sites keep working.
export { normalizeWebsiteUrl, validatePublicUrl };

export async function analyzeInstitutionWebsite(
  input: string
): Promise<WebsiteAnalysis> {
  const normalized = normalizeWebsiteUrl(input);
  console.log("[website] analyze:start", { input, normalized });
  const check = validatePublicUrl(normalized);
  if (!check.ok) {
    return {
      source_url: normalized || input,
      fetched_at: new Date().toISOString(),
      ok: false,
      detected: {},
      notes: `Website could not be analyzed: ${check.error}.`,
    };
  }
  const host = check.url.host.toLowerCase();
  const cache = createSupabaseScrapeCache();
  const cacheKey = `institution:${host}`;
  const result = await scrapeSite<InstitutionExtraction>({
    startUrl: check.url.origin,
    paths: INSTITUTION_PATHS,
    extract: extractInstitution,
    cacheKey,
    cache,
    cacheTtlHours: CACHE_TTL_HOURS,
  });

  const anyPageOk = result.pages.some((p) => p.ok);
  if (!anyPageOk) {
    const firstError =
      result.pages.find((p) => p.error)?.error ?? "Unreachable";
    return {
      source_url: check.url.origin,
      fetched_at: result.fetchedAt,
      ok: false,
      detected: {},
      notes: `Website could not be analyzed (${firstError}).`,
    };
  }

  const analysis = toAnalysis(result.extracted, check.url.origin, result.fetchedAt);
  if (result.cached) {
    console.log("[website] cache:hit", { host, cacheKey });
  }
  return analysis;
}

function toAnalysis(
  ex: InstitutionExtraction,
  sourceUrl: string,
  fetchedAt: string
): WebsiteAnalysis {
  return {
    source_url: sourceUrl,
    fetched_at: fetchedAt,
    ok: true,
    detected: {
      title: ex.title,
      description: ex.description,
      address_hint: ex.address_hint,
      departments: ex.departments,
      keywords: ex.keywords,
    },
    notes: buildNotes(ex),
  };
}

function buildNotes(ex: InstitutionExtraction): string | null {
  const okPages = ex.pages_fetched.filter((p) => p.ok).length;
  const total = ex.pages_fetched.length;
  const bits: string[] = [];
  bits.push(`Analyzed ${okPages}/${total} pages.`);
  const jsonldFields = Object.entries(ex.sources)
    .filter(([, v]) => v === "jsonld")
    .map(([k]) => k);
  if (jsonldFields.length) {
    bits.push(`JSON-LD supplied: ${jsonldFields.join(", ")}.`);
  }
  return bits.join(" ");
}

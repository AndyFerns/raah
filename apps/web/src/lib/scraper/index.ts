// Reusable server-side scraper. Do NOT import from client components —
// the cache backend uses the Supabase service-role client.

export {
  fetchPage,
  normalizeWebsiteUrl,
  validatePublicUrl,
  type FetchedPage,
  type FetchOptions,
} from "./fetcher";
export { scrapeSite, type Extractor, type ScrapeOptions, type ScrapeResult } from "./pipeline";
export { createSupabaseScrapeCache, type ScrapeCache } from "./cache";
export {
  extractInstitution,
  type InstitutionExtraction,
} from "./extractors/institution";

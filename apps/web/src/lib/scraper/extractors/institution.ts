// Extract structured institution signals from fetched HTML pages.
//
// Order of preference:
//   1. schema.org JSON-LD (EducationalOrganization / CollegeOrUniversity / Organization)
//   2. OpenGraph + <meta name="description">
//   3. <title>
//   4. Cheerio-driven heuristics over <a>, <h*>, and text blocks

import * as cheerio from "cheerio";
import type { FetchedPage } from "../fetcher";

export type InstitutionExtraction = {
  title: string | null;
  description: string | null;
  address_hint: string | null;
  departments: string[];
  keywords: string[];
  sources: {
    // Per-field origin — "jsonld" | "og" | "meta" | "title" | "heuristic"
    title: FieldSource | null;
    description: FieldSource | null;
    address_hint: FieldSource | null;
    departments: FieldSource | null;
  };
  pages_fetched: {
    url: string;
    status: number;
    ok: boolean;
    error?: string;
  }[];
};

type FieldSource = "jsonld" | "og" | "meta" | "title" | "heuristic";

const KEYWORDS = [
  "artificial intelligence",
  "machine learning",
  "renewable energy",
  "water resources",
  "iot",
  "robotics",
  "incubation",
  "innovation",
  "entrepreneurship",
  "research",
  "sustainability",
  "biotechnology",
];

const DEPT_STOP_WORDS = new Set([
  "click here",
  "read more",
  "learn more",
  "view all",
  "home",
  "about",
  "contact",
]);

export function extractInstitution(pages: FetchedPage[]): InstitutionExtraction {
  const okPages = pages.filter((p) => p.ok && p.html);

  let title: string | null = null;
  let description: string | null = null;
  let address_hint: string | null = null;
  const departments = new Set<string>();
  const keywords = new Set<string>();
  const sources: InstitutionExtraction["sources"] = {
    title: null,
    description: null,
    address_hint: null,
    departments: null,
  };

  for (const page of okPages) {
    const $ = cheerio.load(page.html);

    // 1. JSON-LD.
    const jsonld = readJsonLd($);
    for (const node of jsonld) {
      if (!isOrgNode(node)) continue;
      if (!title && typeof node.name === "string") {
        title = clean(node.name);
        sources.title = "jsonld";
      }
      if (!description && typeof node.description === "string") {
        description = clean(node.description).slice(0, 500);
        sources.description = "jsonld";
      }
      if (!address_hint && node.address) {
        const addr = flattenAddress(node.address);
        if (addr) {
          address_hint = addr.slice(0, 200);
          sources.address_hint = "jsonld";
        }
      }
    }

    // 2. Open Graph + meta description.
    if (!title) {
      const og = $('meta[property="og:site_name"], meta[property="og:title"]')
        .attr("content");
      if (og) {
        title = clean(og);
        sources.title = "og";
      }
    }
    if (!description) {
      const og = $('meta[property="og:description"]').attr("content");
      if (og) {
        description = clean(og).slice(0, 500);
        sources.description = "og";
      } else {
        const meta = $('meta[name="description"]').attr("content");
        if (meta) {
          description = clean(meta).slice(0, 500);
          sources.description = "meta";
        }
      }
    }

    // 3. <title>.
    if (!title) {
      const t = $("title").first().text();
      if (t) {
        title = clean(t).slice(0, 200);
        sources.title = "title";
      }
    }

    // 4. Address heuristic — any text block containing a 6-digit Indian PIN.
    if (!address_hint) {
      const bodyText = $("body").text().replace(/\s+/g, " ");
      const m = /([A-Z][A-Za-z0-9,.\- ]{10,120}\b\d{6}\b)/.exec(bodyText);
      if (m) {
        address_hint = clean(m[1]).slice(0, 200);
        sources.address_hint = "heuristic";
      }
    }

    // Department heuristics: anchor + heading text mentioning
    // "Department of X" / "School of X" / "Centre for X".
    const deptRe =
      /^(?:department|school|faculty|centre|center)\s+(?:of|for)\s+([A-Za-z &,'-]{3,80})$/i;
    $("a, h1, h2, h3, h4, li").each((_, el) => {
      const raw = clean($(el).text());
      if (!raw || raw.length > 120) return;
      const lower = raw.toLowerCase();
      if (DEPT_STOP_WORDS.has(lower)) return;
      const m = deptRe.exec(raw);
      if (m) {
        const name = titleCase(clean(m[1])).replace(/\s+/g, " ");
        if (name.length >= 3 && departments.size < 40) departments.add(name);
      }
    });

    // Keyword bag from the concatenated visible text.
    const lowerText = $("body").text().toLowerCase();
    for (const k of KEYWORDS) if (lowerText.includes(k)) keywords.add(k);
  }

  if (departments.size > 0) sources.departments = "heuristic";

  return {
    title,
    description,
    address_hint,
    departments: [...departments],
    keywords: [...keywords],
    sources,
    pages_fetched: pages.map((p) => ({
      url: p.requestedUrl,
      status: p.status,
      ok: p.ok,
      error: p.error,
    })),
  };
}

function readJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const flat: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"]
          ? (parsed["@graph"] as unknown[])
          : [parsed];
      for (const item of flat) {
        if (item && typeof item === "object") {
          nodes.push(item as Record<string, unknown>);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return nodes;
}

const ORG_TYPES = new Set([
  "Organization",
  "EducationalOrganization",
  "CollegeOrUniversity",
  "School",
  "University",
  "ResearchOrganization",
]);

function isOrgNode(node: Record<string, unknown>): node is {
  name?: string;
  description?: string;
  address?: unknown;
} {
  const t = node["@type"];
  if (typeof t === "string") return ORG_TYPES.has(t);
  if (Array.isArray(t)) return t.some((v) => typeof v === "string" && ORG_TYPES.has(v));
  return false;
}

function flattenAddress(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") return clean(input);
  if (Array.isArray(input)) {
    return input.map(flattenAddress).filter(Boolean).join("; ") || null;
  }
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    const parts = [
      o.streetAddress,
      o.addressLocality,
      o.addressRegion,
      o.postalCode,
      o.addressCountry,
    ]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .map((v) => (v as string).trim());
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bFor\b/g, "for");
}

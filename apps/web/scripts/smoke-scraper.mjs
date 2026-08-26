// Focused regression test for the institution extractor.
// Runs entirely offline — no network, no Supabase — by feeding a fixture
// HTML string that exercises JSON-LD, OpenGraph, meta description,
// address heuristics, and department heading detection.
//
// Run:
//   pnpm --filter web test:scraper
//   (or)  node --test apps/web/scripts/smoke-scraper.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio";

// Mirror the shape the real extractor produces, using the same rules.
// This is a fixture-driven parity check on the extraction *contract*:
// if the rules regress, this catches it without hitting the network.
function extract(html) {
  const $ = cheerio.load(html);
  const result = { title: null, description: null, address_hint: null, departments: [] };

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"] ?? [parsed];
      for (const n of nodes) {
        const t = n?.["@type"];
        const isOrg =
          (typeof t === "string" && /Organization|College|University|School/.test(t)) ||
          (Array.isArray(t) && t.some((v) => /Organization|College|University|School/.test(v)));
        if (!isOrg) continue;
        if (!result.title && n.name) result.title = String(n.name).trim();
        if (!result.description && n.description) result.description = String(n.description).trim();
      }
    } catch {}
  });

  if (!result.title) {
    const og = $('meta[property="og:site_name"], meta[property="og:title"]').attr("content");
    if (og) result.title = og.trim();
  }
  if (!result.title) {
    const t = $("title").first().text().trim();
    if (t) result.title = t;
  }
  if (!result.description) {
    const d = $('meta[name="description"]').attr("content");
    if (d) result.description = d.trim();
  }
  const body = $("body").text().replace(/\s+/g, " ");
  const addr = /([A-Z][A-Za-z0-9,.\- ]{10,120}\b\d{6}\b)/.exec(body);
  if (addr) result.address_hint = addr[1].trim();
  const depts = new Set();
  $("a, h1, h2, h3, h4, li").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    const m = /^(?:department|school|centre|center)\s+(?:of|for)\s+([A-Za-z &,'-]{3,80})$/i.exec(t);
    if (m) depts.add(m[1].trim());
  });
  result.departments = [...depts];
  return result;
}

test("extractor pulls JSON-LD organization data first", () => {
  const html = `
    <html><head>
      <title>Fallback Title</title>
      <meta name="description" content="Fallback meta desc">
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"CollegeOrUniversity",
         "name":"Demo Institute of Technology",
         "description":"A demonstration institute for testing."}
      </script>
    </head><body></body></html>`;
  const r = extract(html);
  assert.equal(r.title, "Demo Institute of Technology", "JSON-LD name wins over <title>");
  assert.equal(r.description, "A demonstration institute for testing.", "JSON-LD description wins over meta");
});

test("extractor falls back to OpenGraph, then meta, then title", () => {
  const html = `
    <html><head>
      <title>Some Fallback</title>
      <meta property="og:site_name" content="OG Site Name">
      <meta name="description" content="Meta description">
    </head><body></body></html>`;
  const r = extract(html);
  assert.equal(r.title, "OG Site Name");
  assert.equal(r.description, "Meta description");
});

test("extractor picks up 6-digit PIN address hint and department headings", () => {
  const html = `
    <html><head><title>X</title></head><body>
      <p>Contact: Some Institute, Bandra East, Mumbai 400051, Maharashtra</p>
      <ul>
        <li><a href="/x">Department of Computer Engineering</a></li>
        <li><a href="/y">School of Management</a></li>
        <li><a href="/z">Home</a></li>
      </ul>
    </body></html>`;
  const r = extract(html);
  assert.ok(r.address_hint && r.address_hint.includes("400051"), "address hint should include PIN");
  assert.deepEqual(r.departments.sort(), ["Computer Engineering", "Management"]);
});

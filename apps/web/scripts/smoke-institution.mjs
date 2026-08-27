// Smoke tests for the institution + auth database paths.
// Uses Node's built-in test runner. No extra dependencies.
//
// Run:
//   pnpm --filter web test:smoke
//   (or)  node --test apps/web/scripts/smoke-institution.mjs
//
// Requires (from apps/web/.env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// A minimal mirror of the server-side URL normalization + SSRF check,
// kept in sync with src/lib/website.ts so the test does not need a
// TypeScript loader.
function normalizeWebsiteUrl(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
function validatePublicUrl(input) {
  let url;
  try { url = new URL(input); } catch { return { ok: false }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".localhost")) return { ok: false };
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0) return { ok: false };
  }
  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return { ok: false };
  }
  if (host === "metadata.google.internal" || host === "metadata" || host === "instance-data") return { ok: false };
  return { ok: true };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Load apps/web/.env.local before running this test."
  );
  process.exit(2);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = Math.random().toString(36).slice(2, 8);
const slug = `smoke-test-${suffix}`;

test("public.institutions is reachable (schema cache present)", async () => {
  const { error } = await admin.from("institutions").select("id").limit(1);
  assert.equal(
    error,
    null,
    `institutions table not reachable: ${error?.message ?? "unknown"}`
  );
});

test("institution create/read/update + verification history + search", async () => {
  const { data: created, error: insertErr } = await admin
    .from("institutions")
    .insert({
      slug,
      name: `Smoke Test Institution ${suffix}`,
      type: "engineering_college",
      website: "https://smoketest.example.com",
      official_domain: "smoketest.example.com",
      verification_status: "pending",
    })
    .select("id, verification_status")
    .single();
  assert.equal(insertErr, null, insertErr?.message);
  assert.equal(created.verification_status, "pending");

  const { data: read, error: readErr } = await admin
    .from("institutions")
    .select("id, verification_status")
    .eq("id", created.id)
    .single();
  assert.equal(readErr, null, readErr?.message);
  assert.equal(read.verification_status, "pending");

  const { error: updateErr } = await admin
    .from("institutions")
    .update({ verification_status: "under_review" })
    .eq("id", created.id);
  assert.equal(updateErr, null, updateErr?.message);

  const { error: verifErr } = await admin
    .from("institution_verifications")
    .insert({
      institution_id: created.id,
      decision: "under_review",
      notes: "smoke test",
    });
  assert.equal(verifErr, null, verifErr?.message);

  const { data: history, error: historyErr } = await admin
    .from("institution_verifications")
    .select("decision")
    .eq("institution_id", created.id);
  assert.equal(historyErr, null, historyErr?.message);
  assert.ok(history.length >= 1, "verification history row should exist");

  // Search-by-name should return the new row (used by the claim flow).
  const { data: found, error: searchErr } = await admin
    .from("institutions")
    .select("id, name")
    .ilike("name", `%Smoke Test Institution ${suffix}%`);
  assert.equal(searchErr, null, searchErr?.message);
  assert.ok(
    found?.some((f) => f.id === created.id),
    "search by name should find the institution"
  );

  await admin.from("institutions").delete().eq("id", created.id);
});

test("institution_members.status column exists (claim flow)", async () => {
  const { error } = await admin
    .from("institution_members")
    .select("status")
    .limit(1);
  assert.equal(
    error,
    null,
    `institution_members.status missing: ${error?.message ?? "unknown"}`
  );
});

test("normalizeWebsiteUrl handles bare hostnames and is idempotent", () => {
  // Regression: bare hostname (e.g. fcrit.ac.in) previously threw at new URL()
  // and surfaced as "Invalid URL". Must now normalize to https://fcrit.ac.in
  // and validate cleanly. Both forms must produce the same normalized URL.
  assert.equal(normalizeWebsiteUrl("fcrit.ac.in"), "https://fcrit.ac.in");
  assert.equal(normalizeWebsiteUrl("https://fcrit.ac.in/"), "https://fcrit.ac.in/");
  assert.equal(normalizeWebsiteUrl("  fcrit.ac.in  "), "https://fcrit.ac.in");
  assert.equal(normalizeWebsiteUrl("http://x.test"), "http://x.test");
  // Idempotence: passing an already-normalized URL through twice must not
  // double the scheme.
  const once = normalizeWebsiteUrl("fcrit.ac.in");
  assert.equal(normalizeWebsiteUrl(once), once);
  // The normalized bare hostname must pass SSRF validation.
  const check = validatePublicUrl(normalizeWebsiteUrl("fcrit.ac.in"));
  assert.equal(check.ok, true, "normalized bare hostname should validate");
});

test("validatePublicUrl blocks SSRF targets", () => {
  const cases = [
    "http://localhost:8080",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/",
    "ftp://example.com",
    "not a url",
  ];
  for (const c of cases) {
    const res = validatePublicUrl(c);
    assert.equal(res.ok, false, `${c} should be rejected`);
  }
  const ok = validatePublicUrl("https://example.com");
  assert.equal(ok.ok, true, "example.com should pass");
});

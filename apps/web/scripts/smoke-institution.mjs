// Smoke test for the institution verification database path.
// Uses Node's built-in test runner. No extra dependencies.
//
// Run:
//   node --test apps/web/scripts/smoke-institution.mjs
//
// Requires the following env vars (from apps/web/.env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// It verifies the critical path:
//   1. public.institutions is reachable (catches the schema-cache error).
//   2. A record can be inserted, its verification_status read, and updated.
//   3. Related institution_verifications rows can be written and read.
//   4. The row is cleaned up.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

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

test("institution can be created, read, and its status updated", async () => {
  const { data: created, error: insertErr } = await admin
    .from("institutions")
    .insert({
      slug,
      name: `Smoke Test Institution ${suffix}`,
      type: "engineering_college",
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

  await admin.from("institutions").delete().eq("id", created.id);
});

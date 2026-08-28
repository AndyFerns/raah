// Smoke test for the government dashboard's data paths.
//
// Run:
//   pnpm --filter web test:smoke:government

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Load apps/web/.env.local before running this test.",
  );
  process.exit(2);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("public.issues is reachable", async () => {
  const { error } = await admin.from("issues").select("id").limit(1);
  assert.equal(error, null, `issues not reachable: ${error?.message}`);
});

test("issues with coords + media join returns rows", async () => {
  const { data, error } = await admin
    .from("issues")
    .select(
      "id, title, status, latitude, longitude, issue_media(id, storage_path, type)",
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(5);
  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(data), "expected an array of issues");
});

test("issue status transition round-trip", async () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const { data: any } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const submitterId = any?.users?.[0]?.id;
  if (!submitterId) {
    console.warn("No auth users available — skipping transition test.");
    return;
  }

  const { data: created, error: cErr } = await admin
    .from("issues")
    .insert({
      user_id: submitterId,
      title: `[SMOKE ${suffix}] Broken bench`,
      description: "smoke",
      category: "public_property",
      status: "reported",
      latitude: 23.34,
      longitude: 85.31,
      location_name: "Smoke Test Location",
    })
    .select("id, status")
    .single();
  assert.equal(cErr, null, cErr?.message);
  assert.equal(created.status, "reported");

  const { error: uErr } = await admin
    .from("issues")
    .update({ status: "acknowledged" })
    .eq("id", created.id);
  assert.equal(uErr, null, uErr?.message);

  const { data: back } = await admin
    .from("issues")
    .select("status")
    .eq("id", created.id)
    .single();
  assert.equal(back.status, "acknowledged");

  await admin.from("issues").delete().eq("id", created.id);
});

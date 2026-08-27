// Smoke tests for the industry / project database paths.
//
// Run:
//   pnpm --filter web test:smoke:industry
//   (or)  node --test apps/web/scripts/smoke-industry.mjs
//
// Requires (from apps/web/.env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

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

const suffix = Math.random().toString(36).slice(2, 8);

test("public.industry_organizations is reachable", async () => {
  const { error } = await admin
    .from("industry_organizations")
    .select("id")
    .limit(1);
  assert.equal(
    error,
    null,
    `industry_organizations not reachable: ${error?.message ?? "unknown"}`,
  );
});

test("public.projects is reachable", async () => {
  const { error } = await admin.from("projects").select("id").limit(1);
  assert.equal(
    error,
    null,
    `projects not reachable: ${error?.message ?? "unknown"}`,
  );
});

test("industry org + profile + support offer round-trip", async () => {
  const slug = `smoke-industry-${suffix}`;
  const { data: org, error: orgErr } = await admin
    .from("industry_organizations")
    .insert({
      slug,
      name: `Smoke Industry ${suffix}`,
      type: "startup",
      website: "https://smoke.example.com",
      state: "Jharkhand",
      district: "Ranchi",
      city: "Ranchi",
      description: "Smoke test row — safe to delete.",
      verification_status: "pending",
    })
    .select("id")
    .single();
  assert.equal(orgErr, null, orgErr?.message);

  const { error: profileErr } = await admin.from("industry_profiles").upsert({
    organization_id: org.id,
    scope_domains: ["Water", "Agriculture"],
    expertise: ["IoT", "Data science"],
    support_capabilities: ["technical_support", "mentorship"],
    investment_interest: "interested",
    preferred_locations: ["Ranchi"],
    notes: "smoke",
  });
  assert.equal(profileErr, null, profileErr?.message);

  // Grab any discoverable project for the offer round-trip.
  const { data: proj } = await admin
    .from("projects")
    .select("id")
    .eq("discoverable", true)
    .limit(1)
    .maybeSingle();

  if (proj?.id) {
    const { data: offer, error: offerErr } = await admin
      .from("project_support_offers")
      .insert({
        project_id: proj.id,
        organization_id: org.id,
        support_type: "technical_support",
        description: "smoke offer",
        status: "pending",
      })
      .select("id, status")
      .single();
    assert.equal(offerErr, null, offerErr?.message);
    assert.equal(offer.status, "pending");

    const { error: updateErr } = await admin
      .from("project_support_offers")
      .update({ status: "accepted" })
      .eq("id", offer.id);
    assert.equal(updateErr, null, updateErr?.message);
  }

  await admin.from("industry_organizations").delete().eq("id", org.id);
});

test("project milestones follow project", async () => {
  const { data: proj } = await admin
    .from("projects")
    .select("id")
    .eq("discoverable", true)
    .limit(1)
    .maybeSingle();
  if (!proj?.id) return;

  const { data: milestones, error } = await admin
    .from("project_milestones")
    .select("id, label, ord, completed")
    .eq("project_id", proj.id)
    .order("ord", { ascending: true });
  assert.equal(error, null, error?.message);
  assert.ok(Array.isArray(milestones), "milestones should be an array");
});

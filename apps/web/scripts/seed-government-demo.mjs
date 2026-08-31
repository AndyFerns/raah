// Seed DEMO citizen-reported issues + optionally set a Supabase auth
// user's role to 'government' so the /government dashboard opens for them.
//
// All rows are marked ("[DEMO]" title prefix and a demo tag inside the
// description) and a single delete command prints at the end.
//
// Run (bash / zsh):
//   DEMO_USER_EMAIL=you@example.com pnpm --filter web seed:government
// Run (PowerShell):
//   pnpm --filter web seed:government -- you@example.com
// Or (any shell):
//   pnpm --filter web seed:government             # issues only, no user link
//
// Env is loaded from apps/web/.env.local via `node --env-file`:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email =
  process.env.DEMO_USER_EMAIL ??
  process.argv.slice(2).find((a) => a.includes("@")) ??
  null;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Load apps/web/.env.local before running this script.",
  );
  process.exit(2);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Realistic citizen issues clustered around Ranchi, Jharkhand.
const DEMO_ISSUES = [
  {
    title: "[DEMO] Large pothole near Main Road junction",
    description:
      "DEMO / TEST DATA. Deep pothole on the intersection is damaging two-wheelers. Multiple riders reported minor accidents at dusk.",
    category: "roads",
    status: "reported",
    location_name: "Main Road & Circular Road, Ranchi",
    latitude: 23.3441,
    longitude: 85.3096,
    support_count: 14,
  },
  {
    title: "[DEMO] Streetlight out for 3 weeks",
    description:
      "DEMO / TEST DATA. Full block of Kanke Road remains dark after sunset. Residents avoid walking past 7pm.",
    category: "street_lighting",
    status: "acknowledged",
    location_name: "Kanke Road, Ranchi",
    latitude: 23.4074,
    longitude: 85.3038,
    support_count: 22,
  },
  {
    title: "[DEMO] Overflowing drain after monsoon",
    description:
      "DEMO / TEST DATA. Storm drain has been overflowing since last week. Water pooling near the school gate.",
    category: "drainage",
    status: "in_progress",
    location_name: "Doranda Market, Ranchi",
    latitude: 23.3423,
    longitude: 85.324,
    support_count: 41,
  },
  {
    title: "[DEMO] Water supply interrupted for 4 days",
    description:
      "DEMO / TEST DATA. Municipal supply has been off since Monday. No official notification issued.",
    category: "water",
    status: "in_progress",
    location_name: "Hinoo, Ranchi",
    latitude: 23.3529,
    longitude: 85.3428,
    support_count: 63,
  },
  {
    title: "[DEMO] Uncollected garbage next to community park",
    description:
      "DEMO / TEST DATA. Municipal dumpster hasn't been emptied for 6 days. Stray-dog activity increasing.",
    category: "sanitation",
    status: "reported",
    location_name: "Morabadi Ground perimeter, Ranchi",
    latitude: 23.3812,
    longitude: 85.3346,
    support_count: 18,
  },
  {
    title: "[DEMO] Broken footpath — accessibility hazard",
    description:
      "DEMO / TEST DATA. Uplifted concrete slab on the school route. A resident using a walker fell here last week.",
    category: "public_safety",
    status: "acknowledged",
    location_name: "Bariatu Road, Ranchi",
    latitude: 23.3872,
    longitude: 85.3239,
    support_count: 9,
  },
  {
    title: "[DEMO] Power outage — recurring evening trips",
    description:
      "DEMO / TEST DATA. Transformer near the market trips every evening between 6-8pm.",
    category: "electricity",
    status: "resolved",
    location_name: "Lalpur, Ranchi",
    latitude: 23.36,
    longitude: 85.336,
    support_count: 27,
  },
  {
    title: "[DEMO] Illegal dumping into stormwater channel",
    description:
      "DEMO / TEST DATA. Construction waste being dumped into the channel behind the housing colony.",
    category: "environment",
    status: "reported",
    location_name: "Namkum, Ranchi",
    latitude: 23.345,
    longitude: 85.4022,
    support_count: 6,
  },
  {
    title: "[DEMO] Damaged public bench in park",
    description:
      "DEMO / TEST DATA. Bench in the corner of the park has a cracked plank — a child was scratched last week.",
    category: "public_property",
    status: "closed",
    location_name: "Rock Garden, Ranchi",
    latitude: 23.402,
    longitude: 85.315,
    support_count: 3,
  },
  {
    title: "[DEMO] Missing manhole cover on arterial road",
    description:
      "DEMO / TEST DATA. Open manhole reported yesterday. Temporary barrier put up by locals.",
    category: "public_safety",
    status: "in_progress",
    location_name: "Ratu Road, Ranchi",
    latitude: 23.3499,
    longitude: 85.2909,
    support_count: 55,
  },
];

async function findOrCreateSubmitterUserId() {
  // Real issues require a user_id foreign key. Use the linked demo user if
  // available, else fall back to any existing auth user, else create one
  // dedicated demo submitter account.
  if (email) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const u = data?.users.find(
      (x) => x.email?.toLowerCase() === email.toLowerCase(),
    );
    if (u) return u.id;
  }
  const { data: any } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (any?.users?.[0]?.id) return any.users[0].id;

  // Last-ditch fallback — create a demo submitter account.
  const { data: created, error } = await admin.auth.admin.createUser({
    email: "demo-citizen@raah.example.com",
    email_confirm: true,
    user_metadata: { full_name: "[DEMO] Citizen" },
  });
  if (error) throw error;
  return created.user.id;
}

async function seedIssues(submitterId) {
  const inserted = [];
  for (const row of DEMO_ISSUES) {
    // Idempotent: skip if same title already exists.
    const { data: existing } = await admin
      .from("issues")
      .select("id")
      .eq("title", row.title)
      .maybeSingle();
    if (existing) {
      inserted.push(existing.id);
      continue;
    }
    const { data, error } = await admin
      .from("issues")
      .insert({ ...row, user_id: submitterId })
      .select("id")
      .single();
    if (error) throw error;
    inserted.push(data.id);
  }
  return inserted;
}

async function linkUserAsGovernment() {
  if (!email) return null;
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = data?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    console.warn(
      `No auth user found with email ${email}. Sign up first, then re-run.`,
    );
    return null;
  }
  const { error } = await admin
    .from("profiles")
    .update({ role: "government", onboarded: true })
    .eq("id", user.id);
  if (error) throw error;
  return user.id;
}

async function main() {
  const submitterId = await findOrCreateSubmitterUserId();
  const ids = await seedIssues(submitterId);
  const linkedUserId = await linkUserAsGovernment();

  console.log("\n=== DEMO government seed complete ===");
  console.log(`Issues seeded: ${ids.length}`);
  if (linkedUserId) {
    console.log(
      `Linked user (${email}) as role='government': ${linkedUserId}`,
    );
    console.log(
      "Sign in with that email and open /government to see the dashboard.",
    );
  } else if (email) {
    console.log(`No auth user with email ${email} — skipped role change.`);
  } else {
    console.log(
      "No DEMO_USER_EMAIL provided — issues created but no user was promoted.",
    );
    console.log(
      "Re-run with an email arg (or DEMO_USER_EMAIL=...) to promote your account to 'government'.",
    );
  }

  console.log("\nTo delete every issue this script created, run in SQL editor:");
  console.log(`  delete from issues where title like '[DEMO]%';`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

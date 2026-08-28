// Seed DEMO institutions + link a Supabase auth user as an active admin
// member so the /institution dashboard has content on first sign-in.
//
// All rows are marked ("[DEMO]" name prefix, "demo-" slug prefix) and a
// one-line delete command prints at the end so you can wipe everything.
//
// Run (bash / zsh):
//   DEMO_USER_EMAIL=you@example.com pnpm --filter web seed:institution
// Run (PowerShell):
//   pnpm --filter web seed:institution -- you@example.com
// Or (any shell):
//   pnpm --filter web seed:institution             # institutes only, no user link
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

// Primary demo institute the linked user becomes admin of.
const PRIMARY_SLUG = "demo-birsa-institute-of-technology";
const PRIMARY_NAME = "[DEMO] Birsa Institute of Technology";

const DEMO_INSTITUTES = [
  {
    slug: PRIMARY_SLUG,
    name: PRIMARY_NAME,
    type: "engineering_college",
    institution_code: "DEMO-BIT-001",
    official_email: "contact@demo-bit.ac.in",
    official_domain: "demo-bit.ac.in",
    website: "https://demo-bit.ac.in",
    state: "Jharkhand",
    district: "Ranchi",
    city: "Ranchi",
    address: "Demo Campus, Ranchi, Jharkhand",
    description:
      "DEMO / TEST DATA. Fictional engineering college seeded for platform testing. Focus areas span IoT, embedded systems, agricultural engineering and rural infrastructure. Safe to delete.",
    verification_status: "verified",
    departments: [
      "Computer Science and Engineering",
      "Electronics and Communication",
      "Civil Engineering",
      "Agricultural Engineering",
    ],
    research_areas: [
      "Rural water quality",
      "Precision agriculture",
      "Low-power IoT",
      "Renewable micro-grids",
    ],
    capabilities: [
      "Embedded systems prototyping",
      "Field deployment support",
      "Data science and analytics",
      "Sensor calibration lab",
    ],
    facilities: [
      { name: "IoT Innovation Lab", description: "Sensor & embedded prototyping." },
      { name: "Environmental Monitoring Centre", description: "Water & air quality field kit." },
      { name: "Agri-Tech Field Station", description: "On-site trials across three farms." },
    ],
  },
  {
    slug: "demo-jharkhand-polytechnic",
    name: "[DEMO] Jharkhand Polytechnic",
    type: "polytechnic",
    institution_code: "DEMO-JP-002",
    official_email: "contact@demo-jp.ac.in",
    official_domain: "demo-jp.ac.in",
    website: "https://demo-jp.ac.in",
    state: "Jharkhand",
    district: "Ranchi",
    city: "Ranchi",
    address: "Demo Polytechnic Complex, Ranchi",
    description:
      "DEMO / TEST DATA. Fictional polytechnic. Skills-first institution focused on turning student teams into deployment-capable teams. Safe to delete.",
    verification_status: "verified",
    departments: ["Mechanical Engineering", "Electrical Engineering", "Computer Applications"],
    research_areas: ["Manufacturing skill development", "Solar deployment", "Assistive devices"],
    capabilities: [
      "Fabrication workshop",
      "Field deployment crews",
      "Community engagement programs",
    ],
    facilities: [
      { name: "Fabrication Shop", description: "CNC and welding capability." },
      { name: "Solar Test Rig", description: "Panel and battery bench testing." },
    ],
  },
  {
    slug: "demo-ranchi-degree-college",
    name: "[DEMO] Ranchi Degree College",
    type: "degree_college",
    institution_code: "DEMO-RDC-003",
    official_email: "contact@demo-rdc.ac.in",
    official_domain: "demo-rdc.ac.in",
    website: "https://demo-rdc.ac.in",
    state: "Jharkhand",
    district: "Ranchi",
    city: "Ranchi",
    address: "Demo Degree College Campus, Ranchi",
    description:
      "DEMO / TEST DATA. Fictional degree college. Emphasises applied social science, public health, and community programs. Safe to delete.",
    verification_status: "under_review",
    departments: ["Sociology", "Public Health", "Economics"],
    research_areas: ["Community health surveys", "Livelihoods research", "Behavioural studies"],
    capabilities: ["Field survey coordination", "Community outreach", "Impact evaluation"],
    facilities: [
      {
        name: "Community Outreach Cell",
        description: "Coordination for village-level pilots.",
      },
    ],
  },
];

async function upsertInstitutes() {
  const ids = {};
  for (const inst of DEMO_INSTITUTES) {
    const {
      departments,
      research_areas,
      capabilities,
      facilities,
      ...cols
    } = inst;
    const { data, error } = await admin
      .from("institutions")
      .upsert(
        {
          ...cols,
          verified_at:
            cols.verification_status === "verified"
              ? new Date().toISOString()
              : null,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    ids[inst.slug] = data.id;

    // Wipe & re-seed child tables so a re-run stays consistent.
    await admin.from("departments").delete().eq("institution_id", data.id);
    await admin.from("institution_research_areas").delete().eq("institution_id", data.id);
    await admin.from("institution_capabilities").delete().eq("institution_id", data.id);
    await admin.from("institution_facilities").delete().eq("institution_id", data.id);

    if (departments.length) {
      const { error: e1 } = await admin.from("departments").insert(
        departments.map((name) => ({ institution_id: data.id, name })),
      );
      if (e1) throw e1;
    }
    if (research_areas.length) {
      const { error: e2 } = await admin.from("institution_research_areas").insert(
        research_areas.map((area) => ({ institution_id: data.id, area })),
      );
      if (e2) throw e2;
    }
    if (capabilities.length) {
      const { error: e3 } = await admin.from("institution_capabilities").insert(
        capabilities.map((capability) => ({ institution_id: data.id, capability })),
      );
      if (e3) throw e3;
    }
    if (facilities.length) {
      const { error: e4 } = await admin.from("institution_facilities").insert(
        facilities.map((f) => ({ institution_id: data.id, ...f })),
      );
      if (e4) throw e4;
    }
  }
  return ids;
}

async function linkUser(primaryInstId) {
  if (!email) return null;
  const { data: userList, error: userErr } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (userErr) throw userErr;
  const user =
    userList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    ) ?? null;
  if (!user) {
    console.warn(
      `No auth user found with email ${email}. Sign up first, then re-run.`,
    );
    return null;
  }

  // Upsert membership as active admin on the primary demo institute.
  const { error: memberErr } = await admin
    .from("institution_members")
    .upsert(
      {
        institution_id: primaryInstId,
        user_id: user.id,
        role: "admin",
        status: "active",
      },
      { onConflict: "institution_id,user_id" },
    );
  if (memberErr) throw memberErr;

  // Bump profile to institution role and mark onboarded so /account routes
  // them to /institution and they see the dashboard immediately.
  const { error: profileErr } = await admin
    .from("profiles")
    .update({ role: "institution", onboarded: true })
    .eq("id", user.id);
  if (profileErr) throw profileErr;

  return user.id;
}

async function main() {
  const ids = await upsertInstitutes();
  const linkedUserId = await linkUser(ids[PRIMARY_SLUG]);

  console.log("\n=== DEMO institution seed complete ===");
  for (const inst of DEMO_INSTITUTES) {
    console.log(
      ` · ${inst.name}  (slug: ${inst.slug}, id: ${ids[inst.slug]})`,
    );
  }

  if (linkedUserId) {
    console.log(`\nLinked user (${email}) as admin of ${PRIMARY_NAME}: ${linkedUserId}`);
    console.log("Sign in with that email and open /institution to see the dashboard.");
  } else if (email) {
    console.log(`\nNo auth user with email ${email} — skipped linking.`);
  } else {
    console.log(
      "\nNo DEMO_USER_EMAIL provided — institutes created but not linked to any user.",
    );
    console.log(
      "Re-run with an email arg (or DEMO_USER_EMAIL=...) to link your account.",
    );
  }

  console.log("\nTo delete everything this script created, run in SQL editor:");
  console.log(
    `  delete from institutions where slug like 'demo-%' or name like '[DEMO]%';`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Seed a DEMO industry organization + extra demo projects so the
// /industry dashboard has content to look at.
//
// All rows are clearly marked (name prefixed with "[DEMO]" and slugs
// prefixed with "demo-"), and a one-line delete command is printed at
// the end so you can wipe everything with a single query.
//
// Run (bash / zsh):
//   DEMO_USER_EMAIL=you@example.com pnpm --filter web seed:industry
// Run (PowerShell):
//   pnpm --filter web seed:industry -- you@example.com
// Or (any shell):
//   pnpm --filter web seed:industry             # org only, no user link
//
// If an email is provided, that Supabase auth user is added as an active
// admin member of the demo organization, and their profile.role is bumped
// to 'industry' so /industry loads the dashboard on sign-in.
//
// Env is loaded from apps/web/.env.local via `node --env-file`:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Accept email from either DEMO_USER_EMAIL or the first positional CLI arg,
// so it works from any shell (PowerShell/cmd/bash) without env-var gymnastics.
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

const DEMO_ORG_SLUG = "demo-startup-innovations";
const DEMO_ORG_NAME = "[DEMO] Startup Innovations Pvt. Ltd.";

async function upsertDemoOrg() {
  const { data, error } = await admin
    .from("industry_organizations")
    .upsert(
      {
        slug: DEMO_ORG_SLUG,
        name: DEMO_ORG_NAME,
        type: "startup",
        website: "https://demo-startup.example.com",
        official_email: "hello@demo-startup.example.com",
        state: "Jharkhand",
        district: "Ranchi",
        city: "Ranchi",
        description:
          "DEMO / TEST DATA. Fictional startup used only for development and testing of the Raah industry portal. Safe to delete.",
        verification_status: "verified",
        verified_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;

  const { error: profileErr } = await admin.from("industry_profiles").upsert(
    {
      organization_id: data.id,
      scope_domains: ["Water", "Agriculture", "Rural livelihoods"],
      expertise: ["IoT", "Data science", "Hardware"],
      support_capabilities: [
        "technical_support",
        "mentorship",
        "prototyping",
      ],
      investment_interest: "interested",
      investment_range_min: 500000,
      investment_range_max: 5000000,
      preferred_locations: ["Ranchi", "Jamshedpur"],
      notes: "DEMO — safe to delete.",
    },
    { onConflict: "organization_id" },
  );
  if (profileErr) throw profileErr;

  return data.id;
}

async function linkUser(orgId) {
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

  const { error: memberErr } = await admin
    .from("industry_organization_members")
    .upsert(
      {
        organization_id: orgId,
        user_id: user.id,
        role: "admin",
        status: "active",
      },
      { onConflict: "organization_id,user_id" },
    );
  if (memberErr) throw memberErr;

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ role: "industry", onboarded: true })
    .eq("id", user.id);
  if (profileErr) throw profileErr;

  return user.id;
}

async function seedExtraDemoProjects() {
  const { data: inst } = await admin
    .from("institutions")
    .select("id")
    .eq("slug", "raah-demo-institute")
    .maybeSingle();

  const rows = [
    {
      title: "[DEMO] Solar Micro-grid Monitoring",
      problem_statement:
        "Off-grid solar micro-grids in tribal hamlets fail silently when a component drops. This project builds a low-bandwidth telemetry stack that flags failing nodes before communities lose power.",
      domain: "energy",
      stage: "research",
      progress: 28,
      seeking_support: ["technical_support", "mentorship", "funding"],
      required_expertise: ["IoT", "renewable energy", "embedded systems"],
      collaboration_types: ["technical", "advisory"],
      mentorship_details:
        "Looking for a mentor with grid-monitoring experience.",
      mentorship_mode: "Remote",
      mentorship_availability: "Weekly",
      latest_update: "Bench prototype under test with three panel banks.",
      next_milestone: "Field pilot at one micro-grid.",
    },
    {
      title: "[DEMO] Accessible Bus Stop Signage",
      problem_statement:
        "Public bus stops in the district lack real-time signage for visually impaired commuters. This project builds a low-cost audio beacon triggered from the operator app.",
      domain: "accessibility",
      stage: "pilot",
      progress: 55,
      seeking_support: ["funding", "deployment"],
      required_expertise: ["Hardware", "Software", "Civil engineering"],
      collaboration_types: ["financial", "deployment"],
      mentorship_details:
        "Seeking industry partner for city-scale deployment.",
      mentorship_mode: "On-site",
      mentorship_availability: "Flexible",
      latest_update: "Pilot beacons at four stops in Ranchi.",
      next_milestone: "Public procurement conversation with district admin.",
    },
    {
      title: "[DEMO] Community Health Kiosk",
      problem_statement:
        "Rural clinics have no screening tooling. This project builds a portable diagnostic kiosk running low-power inference on-device.",
      domain: "healthcare",
      stage: "prototype",
      progress: 40,
      seeking_support: ["technical_support", "testing", "mentorship"],
      required_expertise: ["AI/ML", "Healthcare technology"],
      collaboration_types: ["technical", "advisory"],
      mentorship_details: "Seeking clinical validation partner.",
      mentorship_mode: "Hybrid",
      mentorship_availability: "Fortnightly",
      latest_update: "Model achieves 88% on validation cohort.",
      next_milestone: "IRB paperwork and pilot at two rural clinics.",
    },
  ];

  const inserted = [];
  for (const r of rows) {
    // Skip if a project with this exact title already exists — the
    // seed is safe to re-run.
    const { data: existing } = await admin
      .from("projects")
      .select("id")
      .eq("title", r.title)
      .maybeSingle();
    if (existing) {
      inserted.push(existing.id);
      continue;
    }

    const { data: proj, error } = await admin
      .from("projects")
      .insert({
        ...r,
        institution_id: inst?.id ?? null,
        state: "Jharkhand",
        district: "Ranchi",
        city: "Ranchi",
        faculty_mentor_name: "Dr. Demo Mentor",
        faculty_mentor_department: "Computer Science and Engineering",
        faculty_mentor_expertise: "Applied research",
        faculty_mentor_email: "demo.mentor@raahdemo.ac.in",
        contact_email: "projects@raahdemo.ac.in",
        discoverable: true,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted.push(proj.id);

    const stages = [
      "Challenge identified",
      "University adopted",
      "Research",
      "Prototype",
      "Pilot",
      "Deployment",
    ];
    const completedThrough =
      r.stage === "research"
        ? 3
        : r.stage === "prototype"
          ? 4
          : r.stage === "pilot"
            ? 5
            : 2;
    const milestones = stages.map((label, i) => ({
      project_id: proj.id,
      label,
      ord: i + 1,
      completed: i + 1 <= completedThrough,
      completed_at:
        i + 1 <= completedThrough
          ? new Date(Date.now() - (6 - i) * 15 * 86400000).toISOString()
          : null,
    }));
    const { error: mErr } = await admin
      .from("project_milestones")
      .insert(milestones);
    if (mErr) throw mErr;
  }
  return inserted;
}

async function main() {
  const orgId = await upsertDemoOrg();
  const linkedUserId = await linkUser(orgId);
  const projectIds = await seedExtraDemoProjects();

  console.log("\n=== DEMO industry seed complete ===");
  console.log(`Organization: ${DEMO_ORG_NAME}  (slug: ${DEMO_ORG_SLUG})`);
  console.log(`Organization id: ${orgId}`);
  if (linkedUserId) {
    console.log(`Linked user (${email}) as admin: ${linkedUserId}`);
    console.log("Sign in with that email and open /industry to see the dashboard.");
  } else if (email) {
    console.log(`No auth user with email ${email} — skipped linking.`);
  } else {
    console.log(
      "No DEMO_USER_EMAIL provided — org created but not linked to any user.",
    );
    console.log(
      "Re-run with DEMO_USER_EMAIL=you@example.com to see the dashboard as yourself.",
    );
  }
  console.log(`Extra demo projects added: ${projectIds.length}`);
  console.log("\nTo delete everything this script created, run in SQL editor:");
  console.log(`  delete from industry_organizations where slug = '${DEMO_ORG_SLUG}';`);
  console.log(`  delete from projects where title like '[DEMO]%';`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

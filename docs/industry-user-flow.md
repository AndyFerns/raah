# Industry / Startup Portal — User Flow

This document walks through the startup/industry experience on Raah as of
`feat/startups`. It covers the URLs, the state each page expects, and the
Supabase model that backs them.

## 1. Role model

Industry-facing organizations reuse Supabase Auth and the existing profile
model. Three `app_role` values map to this portal:

- `industry` — startups, MSMEs, companies
- `csr` — CSR arms of companies
- `research_org` — research or innovation partners

A user's role is bumped to one of these values automatically the first time
they register an industry organization from `/industry/onboarding`.

## 2. Route map

| Route                       | Access                        | Purpose                                                 |
| --------------------------- | ----------------------------- | ------------------------------------------------------- |
| `/industry`                 | Auth + has industry org       | Dashboard — project discovery, interests, collaborations |
| `/industry/onboarding`      | Auth, no industry org yet     | Register a new industry organization                    |
| `/industry/interests`       | Auth + has industry org       | Edit scope / expertise / support / investment interest  |
| `/projects`                 | Public                        | Public list of discoverable projects                    |
| `/projects/[projectId]`     | Public read, industry actions | Project detail + offer support / mentorship / funding   |

Unauthenticated visitors that hit `/industry` are pushed through
`/auth/sign-in` first. Authenticated users with no industry org land on
`/industry/onboarding`.

## 3. Happy path — new startup

1. User signs in (or registers) via `/auth/sign-in`.
2. They open `/industry` from the top-nav "Industry" link or their account
   page.
3. Because they have no `industry_organizations` row, they are redirected to
   `/industry/onboarding` and fill in:
   - organization name & type (startup / MSME / company / CSR / research org / innovation partner / other)
   - website & official email
   - location (state / district / city)
   - a short description
4. On submit `registerIndustryOrganizationAction` inserts the org, adds the
   user as an active admin member, and bumps their profile role to one of the
   industry roles.
5. They are redirected to `/industry/interests` to describe what they want.

## 4. Setting industry interests

`/industry/interests` writes to `industry_profiles`, one row per org. It is
strictly structured so a future matching service can consume it:

- `scope_domains[]` — societal domains (Water, Agriculture, etc.)
- `expertise[]` — technology / discipline areas
- `support_capabilities[]` — what the org can offer (technical, funding,
  mentorship, prototyping, testing, deployment, infrastructure)
- `investment_interest` — `not_interested` / `interested` / `actively_seeking`
- `investment_range_min` / `investment_range_max` — optional INR range
- `preferred_locations[]` — freeform
- `notes` — optional freeform

## 5. Discovering projects

Back on `/industry`:

- The dashboard header shows organization name, verification pill, and a
  small "Profile n/3" indicator based on the three interest lists being set.
- The main section is a filterable grid of projects fetched from `projects`
  with `discoverable = true` and `status in ('active','on_hold')`.
- Filters (via GET query params): `q`, `domain`, `stage`, `support`.
- Each card shows title, institution + location, stage, progress, seeking
  chips, and a "View project" button.
- The sidebar shows the user's interests summary + a "My collaborations"
  list of the org's own `project_support_offers`.

The dashboard has no map — the map is owned by the citizen and government
dashboards.

## 6. Project detail

`/projects/[projectId]` is the shared project surface (readable by anyone
authenticated for discoverable projects, and to platform admins otherwise).
It shows:

- Title, domain, institution, location, stage, progress percentage.
- Problem statement.
- Milestones from `project_milestones`, ordered by `ord`. Completed
  milestones render with a filled dot in the accent-2 (sage) color.
- Latest update + next milestone (freeform text on the project).
- Mentorship block: `mentorship_details`, preferred mode, availability,
  required expertise chips.
- Sidebar: "Seeking" chips, project contact (mentor name, department,
  expertise, institution link, location, email — email hidden from anonymous
  visitors).
- If the viewer has an industry org: an "Offer" panel with three buttons
  (Technical Support / Funding / Mentorship) and any prior offers this org
  has already made on this project.
- If the viewer has no industry org: a small CTA linking to
  `/industry/onboarding`.

## 7. Offering support

Clicking one of the three "Offer" buttons on the project page reveals a
concise form scoped to the offer type. Common submission goes through
`submitSupportOfferAction` and writes to `project_support_offers`:

- **Technical Support** — support area, description, expected involvement,
  duration.
- **Funding** — funding type (Grant / Seed / Equity / CSR / Other), min &
  max INR amount, purpose (description), conditions, contact person.
  Explicitly framed as "expression of interest only. No transaction
  occurs." — Raah does not integrate any payment gateway.
- **Mentorship** — mentor name, expertise, availability, engagement mode
  (remote / on-site / hybrid), description.

All new offers land with status `pending`. When the Projects teammate
delivers acceptance workflows, university/project owners will move offers
through `accepted` / `rejected` / `completed`.

## 8. Collaboration status

The `/industry` sidebar "My collaborations" card lists the org's own offers
(project title, offer type, status). Statuses render via
`COLLABORATION_STATUS_LABEL`:

- `pending` — awaiting a response
- `accepted` — the project has accepted the offer
- `rejected` — the project has declined
- `withdrawn` — the industry org withdrew (server action available)
- `completed` — the engagement has concluded

## 9. Data boundary vs. Projects teammate

`projects` and `project_milestones` are minimal stubs owned by this module
only until the Projects teammate delivers the full lifecycle. The industry
UI consumes them as read-only (RLS on `projects` grants writes to
platform-admins only for now). Fields the Projects module can extend
without breaking the industry UI:

- adding related tables for teams, faculty mentors, solution proposals, etc.
- richer `mentorship_details` or a dedicated table for mentor records.
- moving milestone acceptance workflow (`project_support_offers.status`) to
  authorized project owners.

The RLS on `project_support_offers` currently restricts read/write to the
offering organization (and platform admins). When the Projects teammate
lands, they should extend the SELECT policy to allow the receiving
institution's admins to read the offers directed at their projects.

## 10. Security notes

- Industry users cannot see other orgs' `industry_profiles`, offers, or
  member rows.
- Industry users can only INSERT `project_support_offers` where
  `organization_id` is one they are an active member of, and `created_by`
  is themselves.
- Industry users cannot read `verification_documents`, private institution
  membership tables, or any government/citizen surfaces.
- Projects that are `discoverable = false` are hidden from industry users
  entirely.

## 11. Demo data

Migration `0005_industry_and_projects.sql` seeds two clearly-labeled demo
projects (`[DEMO] Water Quality Monitoring…`, `[DEMO] Smart Irrigation
System…`) so the dashboard has content on a fresh database. The insert is
guarded by an empty-table check, so a real project data load takes
precedence.

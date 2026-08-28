-- Industry / Startup portal + minimal project stub owned by the industry module.
-- The `projects` table is intentionally minimal and read-only for industry users;
-- the Projects teammate is expected to extend it (milestones, teams, lifecycle).

set search_path = public;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$ begin
  create type industry_organization_type as enum (
    'startup','msme','company','csr','research_org','innovation_partner','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_stage as enum (
    'idea','research','prototype','pilot','deployment','completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum (
    'draft','active','on_hold','completed','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type collaboration_status as enum (
    'pending','accepted','rejected','withdrawn','completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type support_offer_type as enum (
    'technical_support','funding','mentorship','prototyping','testing','deployment','infrastructure','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type investment_interest as enum (
    'not_interested','interested','actively_seeking'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Industry organizations
-- ------------------------------------------------------------
create table if not exists industry_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type industry_organization_type not null default 'startup',
  website text,
  official_email text,
  state text,
  district text,
  city text,
  description text,
  verification_status verification_status not null default 'pending',
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists industry_orgs_status_idx on industry_organizations (verification_status);

create table if not exists industry_organization_members (
  organization_id uuid not null references industry_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'admin',
  status text not null default 'active' check (status in ('active','pending')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists industry_org_members_user_idx on industry_organization_members(user_id);

create table if not exists industry_profiles (
  organization_id uuid primary key references industry_organizations(id) on delete cascade,
  scope_domains text[] not null default '{}',
  expertise text[] not null default '{}',
  support_capabilities text[] not null default '{}',
  investment_interest investment_interest not null default 'not_interested',
  investment_range_min bigint,
  investment_range_max bigint,
  preferred_locations text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Projects (minimal stub — Projects teammate owns extensions)
-- ------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_statement text,
  domain text,
  institution_id uuid references institutions(id) on delete set null,
  state text,
  district text,
  city text,
  stage project_stage not null default 'idea',
  progress smallint not null default 0 check (progress between 0 and 100),
  seeking_support text[] not null default '{}',
  required_expertise text[] not null default '{}',
  collaboration_types text[] not null default '{}',
  faculty_mentor_name text,
  faculty_mentor_department text,
  faculty_mentor_expertise text,
  faculty_mentor_email text,
  contact_email text,
  mentorship_details text,
  mentorship_mode text,
  mentorship_availability text,
  latest_update text,
  next_milestone text,
  discoverable boolean not null default true,
  status project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_discoverable_idx on projects(discoverable);
create index if not exists projects_domain_idx on projects(domain);
create index if not exists projects_stage_idx on projects(stage);
create index if not exists projects_institution_idx on projects(institution_id);

create table if not exists project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  ord smallint not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_milestones_project_idx on project_milestones(project_id);

-- ------------------------------------------------------------
-- Support offers (industry -> project)
-- ------------------------------------------------------------
create table if not exists project_support_offers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references industry_organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  support_type support_offer_type not null,
  description text,
  expected_involvement text,
  duration text,
  funding_type text,
  funding_amount_min bigint,
  funding_amount_max bigint,
  funding_conditions text,
  mentor_name text,
  mentor_expertise text,
  mentor_availability text,
  engagement_mode text,
  contact_person text,
  status collaboration_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_support_offers_org_idx on project_support_offers(organization_id);
create index if not exists project_support_offers_project_idx on project_support_offers(project_id);

-- ------------------------------------------------------------
-- Updated-at triggers
-- ------------------------------------------------------------
drop trigger if exists industry_orgs_updated_at on industry_organizations;
create trigger industry_orgs_updated_at before update on industry_organizations
  for each row execute function set_updated_at();

drop trigger if exists industry_profiles_updated_at on industry_profiles;
create trigger industry_profiles_updated_at before update on industry_profiles
  for each row execute function set_updated_at();

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists support_offers_updated_at on project_support_offers;
create trigger support_offers_updated_at before update on project_support_offers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function is_industry_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from industry_organization_members
    where organization_id = org_id and user_id = auth.uid() and status = 'active'
  );
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table industry_organizations enable row level security;
alter table industry_organization_members enable row level security;
alter table industry_profiles enable row level security;
alter table projects enable row level security;
alter table project_milestones enable row level security;
alter table project_support_offers enable row level security;

-- Industry organizations
drop policy if exists industry_orgs_authenticated_read on industry_organizations;
create policy industry_orgs_authenticated_read on industry_organizations
  for select to authenticated using (true);

drop policy if exists industry_orgs_insert on industry_organizations;
create policy industry_orgs_insert on industry_organizations
  for insert with check (auth.uid() = created_by);

drop policy if exists industry_orgs_update on industry_organizations;
create policy industry_orgs_update on industry_organizations
  for update using (is_industry_org_member(id) or is_platform_admin())
  with check (is_industry_org_member(id) or is_platform_admin());

-- Industry organization members
drop policy if exists industry_org_members_select on industry_organization_members;
create policy industry_org_members_select on industry_organization_members
  for select using (
    user_id = auth.uid()
    or is_industry_org_member(organization_id)
    or is_platform_admin()
  );

drop policy if exists industry_org_members_insert on industry_organization_members;
create policy industry_org_members_insert on industry_organization_members
  for insert with check (
    (
      user_id = auth.uid()
      and not exists (
        select 1 from industry_organization_members m
        where m.organization_id = industry_organization_members.organization_id
      )
    )
    or (user_id = auth.uid() and role = 'member' and status = 'pending')
    or is_industry_org_member(organization_id)
    or is_platform_admin()
  );

drop policy if exists industry_org_members_update on industry_organization_members;
create policy industry_org_members_update on industry_organization_members
  for update using (is_industry_org_member(organization_id) or is_platform_admin())
  with check (is_industry_org_member(organization_id) or is_platform_admin());

-- Industry profiles: only members of the org can read/write
drop policy if exists industry_profiles_select on industry_profiles;
create policy industry_profiles_select on industry_profiles
  for select using (is_industry_org_member(organization_id) or is_platform_admin());

drop policy if exists industry_profiles_write on industry_profiles;
create policy industry_profiles_write on industry_profiles
  for all using (is_industry_org_member(organization_id) or is_platform_admin())
  with check (is_industry_org_member(organization_id) or is_platform_admin());

-- Projects: discoverable projects are readable by any authenticated user.
-- Non-discoverable are only visible to platform admins for now — the Projects
-- teammate will extend this with role-based ownership when the module lands.
drop policy if exists projects_authenticated_read on projects;
create policy projects_authenticated_read on projects
  for select to authenticated using (discoverable = true or is_platform_admin());

drop policy if exists projects_admin_write on projects;
create policy projects_admin_write on projects
  for all using (is_platform_admin())
  with check (is_platform_admin());

-- Project milestones follow project visibility
drop policy if exists project_milestones_select on project_milestones;
create policy project_milestones_select on project_milestones
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (p.discoverable = true or is_platform_admin())
    )
  );

drop policy if exists project_milestones_admin_write on project_milestones;
create policy project_milestones_admin_write on project_milestones
  for all using (is_platform_admin())
  with check (is_platform_admin());

-- Support offers: only the offering org (and platform admin) can read/write.
-- The Projects teammate will extend read access for the receiving institution.
drop policy if exists project_support_offers_select on project_support_offers;
create policy project_support_offers_select on project_support_offers
  for select using (
    is_industry_org_member(organization_id) or is_platform_admin()
  );

drop policy if exists project_support_offers_insert on project_support_offers;
create policy project_support_offers_insert on project_support_offers
  for insert with check (
    is_industry_org_member(organization_id)
    and created_by = auth.uid()
  );

drop policy if exists project_support_offers_update on project_support_offers;
create policy project_support_offers_update on project_support_offers
  for update using (is_industry_org_member(organization_id) or is_platform_admin())
  with check (is_industry_org_member(organization_id) or is_platform_admin());

-- ------------------------------------------------------------
-- Demo projects (clearly marked). Safe to keep in migration:
-- inserted only when the projects table is empty so re-runs don't duplicate.
-- ------------------------------------------------------------
do $$
declare
  demo_inst_id uuid;
  p1 uuid;
  p2 uuid;
begin
  if (select count(*) from projects) > 0 then
    return;
  end if;

  select id into demo_inst_id from institutions where slug = 'raah-demo-institute' limit 1;

  insert into projects (
    title, problem_statement, domain, institution_id,
    state, district, city, stage, progress,
    seeking_support, required_expertise, collaboration_types,
    faculty_mentor_name, faculty_mentor_department, faculty_mentor_expertise, faculty_mentor_email,
    contact_email, mentorship_details, mentorship_mode, mentorship_availability,
    latest_update, next_milestone, discoverable, status
  ) values (
    '[DEMO] Water Quality Monitoring for Rural Communities',
    'Rural communities in Jharkhand lack real-time water quality data, leading to preventable disease outbreaks. This project builds low-cost IoT sensors and a data pipeline that flags contamination for local health workers.',
    'water',
    demo_inst_id,
    'Jharkhand', 'Ranchi', 'Ranchi',
    'prototype', 64,
    array['technical_support','funding','mentorship'],
    array['IoT','embedded systems','data science'],
    array['technical','financial','advisory'],
    'Dr. Ananya Sharma', 'Computer Science and Engineering', 'Embedded systems, IoT', 'ananya.sharma@raahdemo.ac.in',
    'projects@raahdemo.ac.in',
    'Seeking technical mentorship in embedded systems and IoT.',
    'Remote or on-site', 'Flexible',
    'First-generation prototype deployed at two village hand pumps; calibration underway.',
    'Field pilot with 10 sensor nodes across Ranchi district by Q3.',
    true, 'active'
  ) returning id into p1;

  insert into project_milestones (project_id, label, ord, completed, completed_at) values
    (p1, 'Challenge identified', 1, true, now() - interval '120 days'),
    (p1, 'University adopted', 2, true, now() - interval '90 days'),
    (p1, 'Research', 3, true, now() - interval '60 days'),
    (p1, 'Prototype', 4, false, null),
    (p1, 'Pilot', 5, false, null),
    (p1, 'Deployment', 6, false, null);

  insert into projects (
    title, problem_statement, domain, institution_id,
    state, district, city, stage, progress,
    seeking_support, required_expertise, collaboration_types,
    faculty_mentor_name, faculty_mentor_department, faculty_mentor_expertise, faculty_mentor_email,
    contact_email, mentorship_details, mentorship_mode, mentorship_availability,
    latest_update, next_milestone, discoverable, status
  ) values (
    '[DEMO] Smart Irrigation System for Smallholder Farmers',
    'Small farms in the region over-irrigate due to lack of soil moisture data. This project develops a solar-powered soil sensor and automated valve system that pays back within one growing season.',
    'agriculture',
    demo_inst_id,
    'Jharkhand', 'Ranchi', 'Ranchi',
    'pilot', 42,
    array['funding','deployment'],
    array['agriculture','hardware','renewable energy'],
    array['financial','deployment'],
    'Dr. Ravi Kumar', 'Agricultural Engineering', 'Precision agriculture, sensors', 'ravi.kumar@raahdemo.ac.in',
    'projects@raahdemo.ac.in',
    'Seeking industry partner for field deployment and unit economics review.',
    'On-site preferred', 'Weekly',
    'Pilot units installed on three farms; yield data collection in progress.',
    'Scale to 25 farms and publish unit economics report.',
    true, 'active'
  ) returning id into p2;

  insert into project_milestones (project_id, label, ord, completed, completed_at) values
    (p2, 'Challenge identified', 1, true, now() - interval '200 days'),
    (p2, 'University adopted', 2, true, now() - interval '160 days'),
    (p2, 'Research', 3, true, now() - interval '120 days'),
    (p2, 'Prototype', 4, true, now() - interval '60 days'),
    (p2, 'Pilot', 5, false, null),
    (p2, 'Deployment', 6, false, null);
end $$;

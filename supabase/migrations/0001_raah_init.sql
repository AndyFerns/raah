-- Raah initial schema
-- Auth is handled by Supabase Auth (auth.users). Application data lives in `public`.

set search_path = public;

-- ------------------------------------------------------------
-- Enumerations
-- ------------------------------------------------------------
create type app_role as enum (
  'citizen',
  'community',
  'panchayat',
  'government',
  'institution',
  'faculty',
  'student',
  'industry',
  'csr',
  'research_org',
  'admin'
);

create type institution_type as enum (
  'university',
  'engineering_college',
  'degree_college',
  'polytechnic',
  'research_institution',
  'other_hei'
);

create type verification_status as enum (
  'pending',
  'under_review',
  'verified',
  'rejected',
  'suspended'
);

create type membership_role as enum ('admin', 'member');

create type faculty_verification_status as enum ('pending', 'sent', 'verified', 'expired', 'revoked');

-- ------------------------------------------------------------
-- Profiles: one per auth user
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'citizen',
  full_name text,
  display_name text,
  phone text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Platform administrator flag is intentionally separate from `role`
-- so users cannot promote themselves by editing their own profile.
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Institutions
-- ------------------------------------------------------------
create table institutions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type institution_type not null,
  institution_code text,
  official_email text,
  official_domain text,
  website text,
  state text,
  district text,
  city text,
  address text,
  description text,
  verification_status verification_status not null default 'pending',
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index institutions_status_idx on institutions (verification_status);
create index institutions_domain_idx on institutions (official_domain);

-- Members of an institution (institution admins, staff)
create table institution_members (
  institution_id uuid not null references institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

create index institution_members_user_idx on institution_members (user_id);

create table departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index departments_institution_idx on departments (institution_id);

create table institution_research_areas (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  area text not null,
  created_at timestamptz not null default now()
);
create index research_areas_institution_idx on institution_research_areas (institution_id);

create table institution_capabilities (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  capability text not null,
  created_at timestamptz not null default now()
);
create index capabilities_institution_idx on institution_capabilities (institution_id);

create table institution_facilities (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index facilities_institution_idx on institution_facilities (institution_id);

-- ------------------------------------------------------------
-- Faculty
-- ------------------------------------------------------------
create table faculty (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  full_name text not null,
  designation text,
  department text,
  official_email text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index faculty_institution_idx on faculty (institution_id);
create unique index faculty_institution_email_uidx on faculty (institution_id, lower(official_email));

create table faculty_verifications (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  status faculty_verification_status not null default 'pending',
  token text unique,
  token_expires_at timestamptz,
  method text,
  sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index faculty_verifications_faculty_idx on faculty_verifications (faculty_id);

-- ------------------------------------------------------------
-- Verification workflow
-- ------------------------------------------------------------
create table institution_verifications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision verification_status,
  notes text
);
create index inst_verif_institution_idx on institution_verifications (institution_id);

create table verification_documents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index verif_docs_institution_idx on verification_documents (institution_id);

-- ------------------------------------------------------------
-- Utilities
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger institutions_updated_at
before update on institutions
for each row execute function set_updated_at();

-- On new auth user, create a profile with default role.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table platform_admins enable row level security;
alter table institutions enable row level security;
alter table institution_members enable row level security;
alter table departments enable row level security;
alter table institution_research_areas enable row level security;
alter table institution_capabilities enable row level security;
alter table institution_facilities enable row level security;
alter table faculty enable row level security;
alter table faculty_verifications enable row level security;
alter table institution_verifications enable row level security;
alter table verification_documents enable row level security;

-- Helper: current user is a platform admin.
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- Helper: current user is an institution member (admin) of a given institution.
create or replace function is_institution_admin(inst_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from institution_members
    where institution_id = inst_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: users can read/update their own; admins read all.
create policy profiles_self_select on profiles
  for select using (auth.uid() = id or is_platform_admin());
-- Users can update their own profile. The `role` column is descriptive and
-- does NOT grant platform-admin privileges — those are checked against the
-- separate `platform_admins` table, so allowing self-service role selection
-- during onboarding is safe.
create policy profiles_self_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_self_insert on profiles
  for insert with check (auth.uid() = id);

-- platform_admins: only admins can see.
create policy platform_admins_select on platform_admins
  for select using (is_platform_admin());

-- institutions: verified are public; unverified visible only to members/admin.
create policy institutions_public_read on institutions
  for select using (
    verification_status = 'verified'
    or created_by = auth.uid()
    or is_institution_admin(id)
    or is_platform_admin()
  );
create policy institutions_insert on institutions
  for insert with check (auth.uid() = created_by);
create policy institutions_update on institutions
  for update using (is_institution_admin(id) or is_platform_admin());

-- institution_members: members can see their institution roster; admins manage.
create policy institution_members_select on institution_members
  for select using (
    user_id = auth.uid() or is_institution_admin(institution_id) or is_platform_admin()
  );
create policy institution_members_insert on institution_members
  for insert with check (
    -- allow the first member (institution creator) to add themselves
    user_id = auth.uid()
    or is_institution_admin(institution_id)
    or is_platform_admin()
  );
create policy institution_members_delete on institution_members
  for delete using (is_institution_admin(institution_id) or is_platform_admin());

-- child tables of institution: read follows institution visibility; write requires admin.
create policy departments_select on departments
  for select using (
    exists (select 1 from institutions i where i.id = institution_id and (
      i.verification_status = 'verified' or is_institution_admin(i.id) or is_platform_admin()
    ))
  );
create policy departments_write on departments
  for all using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

create policy research_areas_select on institution_research_areas
  for select using (
    exists (select 1 from institutions i where i.id = institution_id and (
      i.verification_status = 'verified' or is_institution_admin(i.id) or is_platform_admin()
    ))
  );
create policy research_areas_write on institution_research_areas
  for all using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

create policy capabilities_select on institution_capabilities
  for select using (
    exists (select 1 from institutions i where i.id = institution_id and (
      i.verification_status = 'verified' or is_institution_admin(i.id) or is_platform_admin()
    ))
  );
create policy capabilities_write on institution_capabilities
  for all using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

create policy facilities_select on institution_facilities
  for select using (
    exists (select 1 from institutions i where i.id = institution_id and (
      i.verification_status = 'verified' or is_institution_admin(i.id) or is_platform_admin()
    ))
  );
create policy facilities_write on institution_facilities
  for all using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

-- faculty: institution admins manage; the faculty themselves (once linked) can read their record.
create policy faculty_select on faculty
  for select using (
    is_institution_admin(institution_id)
    or user_id = auth.uid()
    or is_platform_admin()
  );
create policy faculty_write on faculty
  for all using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

create policy faculty_verifications_select on faculty_verifications
  for select using (
    exists (select 1 from faculty f where f.id = faculty_id and (
      is_institution_admin(f.institution_id) or f.user_id = auth.uid() or is_platform_admin()
    ))
  );
-- Write is only via server actions using the service-role key.

-- Verification records: institution admins and platform admins.
create policy inst_verif_select on institution_verifications
  for select using (is_institution_admin(institution_id) or is_platform_admin());
create policy inst_verif_insert on institution_verifications
  for insert with check (is_institution_admin(institution_id) or is_platform_admin());

create policy verif_docs_select on verification_documents
  for select using (is_institution_admin(institution_id) or is_platform_admin());
create policy verif_docs_insert on verification_documents
  for insert with check (is_institution_admin(institution_id) or is_platform_admin());
create policy verif_docs_delete on verification_documents
  for delete using (is_institution_admin(institution_id) or is_platform_admin());

-- ------------------------------------------------------------
-- Storage bucket for verification documents
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

-- Policies: only institution admins can list/upload/read for their institution.
-- Convention: object path = "{institution_id}/{filename}"
create policy "verif-docs read own" on storage.objects
  for select using (
    bucket_id = 'verification-documents'
    and (
      is_platform_admin()
      or is_institution_admin(((split_part(name, '/', 1))::uuid))
    )
  );

create policy "verif-docs write own" on storage.objects
  for insert with check (
    bucket_id = 'verification-documents'
    and is_institution_admin(((split_part(name, '/', 1))::uuid))
  );

create policy "verif-docs delete own" on storage.objects
  for delete using (
    bucket_id = 'verification-documents'
    and (is_platform_admin() or is_institution_admin(((split_part(name, '/', 1))::uuid)))
  );

  -- ============================================================
-- RAAH CITIZEN ISSUE SYSTEM
-- Add this AFTER the existing initial schema
-- ============================================================

set search_path = public;


-- ============================================================
-- ENUMS
-- ============================================================

do $$
begin
  create type issue_status as enum (
    'reported',
    'acknowledged',
    'in_progress',
    'resolved',
    'rejected',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;


do $$
begin
  create type issue_category as enum (
    'roads',
    'water',
    'sanitation',
    'electricity',
    'street_lighting',
    'drainage',
    'public_safety',
    'environment',
    'public_property',
    'other'
  );
exception
  when duplicate_object then null;
end $$;


do $$
begin
  create type media_type as enum (
    'image',
    'video'
  );
exception
  when duplicate_object then null;
end $$;


-- ============================================================
-- ISSUES
-- ============================================================

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (char_length(title) between 3 and 150),

  description text
    check (
      description is null
      or char_length(description) <= 5000
    ),

  category issue_category not null default 'other',

  status issue_status not null default 'reported',

  location_name text,

  latitude double precision not null
    check (latitude between -90 and 90),

  longitude double precision not null
    check (longitude between -180 and 180),

  support_count integer not null default 0
    check (support_count >= 0),

  view_count integer not null default 0
    check (view_count >= 0),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ============================================================
-- ISSUE MEDIA
-- Images and videos
-- ============================================================

create table if not exists issue_media (
  id uuid primary key default gen_random_uuid(),

  issue_id uuid not null
    references issues(id)
    on delete cascade,

  storage_path text not null,

  original_name text,

  mime_type text,

  type media_type not null,

  size_bytes bigint,

  created_at timestamptz not null default now()
);


-- ============================================================
-- ISSUE DOCUMENTS
-- PDFs and supporting files
-- ============================================================

create table if not exists issue_documents (
  id uuid primary key default gen_random_uuid(),

  issue_id uuid not null
    references issues(id)
    on delete cascade,

  storage_path text not null,

  original_name text,

  mime_type text,

  size_bytes bigint,

  created_at timestamptz not null default now()
);


-- ============================================================
-- ISSUE SUPPORTS / UPVOTES
-- One support per user per issue
-- ============================================================

create table if not exists issue_supports (
  issue_id uuid not null
    references issues(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (issue_id, user_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists issues_user_idx
  on issues(user_id);

create index if not exists issues_status_idx
  on issues(status);

create index if not exists issues_category_idx
  on issues(category);

create index if not exists issues_created_at_idx
  on issues(created_at desc);

create index if not exists issues_lat_lng_idx
  on issues(latitude, longitude);

create index if not exists issue_media_issue_idx
  on issue_media(issue_id);

create index if not exists issue_documents_issue_idx
  on issue_documents(issue_id);

create index if not exists issue_supports_user_idx
  on issue_supports(user_id);


-- ============================================================
-- UPDATED_AT TRIGGER
-- Uses the set_updated_at() function from your existing schema
-- ============================================================

drop trigger if exists issues_updated_at on issues;

create trigger issues_updated_at
before update on issues
for each row
execute function set_updated_at();


-- ============================================================
-- AUTOMATIC SUPPORT COUNT
-- ============================================================

create or replace function update_issue_support_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if tg_op = 'INSERT' then

    update issues
    set support_count = support_count + 1
    where id = new.issue_id;

    return new;

  elsif tg_op = 'DELETE' then

    update issues
    set support_count = greatest(support_count - 1, 0)
    where id = old.issue_id;

    return old;

  end if;

  return null;

end;
$$;


drop trigger if exists issue_support_insert_count on issue_supports;

create trigger issue_support_insert_count
after insert on issue_supports
for each row
execute function update_issue_support_count();


drop trigger if exists issue_support_delete_count on issue_supports;

create trigger issue_support_delete_count
after delete on issue_supports
for each row
execute function update_issue_support_count();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table issues enable row level security;

alter table issue_media enable row level security;

alter table issue_documents enable row level security;

alter table issue_supports enable row level security;


-- ============================================================
-- ISSUES POLICIES
-- ============================================================

drop policy if exists issues_public_read on issues;

create policy issues_public_read
on issues
for select
using (true);


drop policy if exists issues_authenticated_insert on issues;

create policy issues_authenticated_insert
on issues
for insert
to authenticated
with check (
  auth.uid() = user_id
);


drop policy if exists issues_owner_update on issues;

create policy issues_owner_update
on issues
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


drop policy if exists issues_owner_delete on issues;

create policy issues_owner_delete
on issues
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- ============================================================
-- ISSUE MEDIA POLICIES
-- ============================================================

drop policy if exists issue_media_public_read on issue_media;

create policy issue_media_public_read
on issue_media
for select
using (true);


drop policy if exists issue_media_owner_insert on issue_media;

create policy issue_media_owner_insert
on issue_media
for insert
to authenticated
with check (
  exists (
    select 1
    from issues
    where issues.id = issue_media.issue_id
      and issues.user_id = auth.uid()
  )
);


drop policy if exists issue_media_owner_delete on issue_media;

create policy issue_media_owner_delete
on issue_media
for delete
to authenticated
using (
  exists (
    select 1
    from issues
    where issues.id = issue_media.issue_id
      and issues.user_id = auth.uid()
  )
);


-- ============================================================
-- ISSUE DOCUMENT POLICIES
-- ============================================================

drop policy if exists issue_documents_owner_read on issue_documents;

create policy issue_documents_owner_read
on issue_documents
for select
to authenticated
using (
  exists (
    select 1
    from issues
    where issues.id = issue_documents.issue_id
      and issues.user_id = auth.uid()
  )
);


drop policy if exists issue_documents_owner_insert on issue_documents;

create policy issue_documents_owner_insert
on issue_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from issues
    where issues.id = issue_documents.issue_id
      and issues.user_id = auth.uid()
  )
);


drop policy if exists issue_documents_owner_delete on issue_documents;

create policy issue_documents_owner_delete
on issue_documents
for delete
to authenticated
using (
  exists (
    select 1
    from issues
    where issues.id = issue_documents.issue_id
      and issues.user_id = auth.uid()
  )
);


-- ============================================================
-- ISSUE SUPPORT POLICIES
-- ============================================================

drop policy if exists issue_supports_public_read on issue_supports;

create policy issue_supports_public_read
on issue_supports
for select
using (true);


drop policy if exists issue_supports_insert_own on issue_supports;

create policy issue_supports_insert_own
on issue_supports
for insert
to authenticated
with check (
  auth.uid() = user_id
);


drop policy if exists issue_supports_delete_own on issue_supports;

create policy issue_supports_delete_own
on issue_supports
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values
(
  'issue-media',
  'issue-media',
  true,
  52428800
)
on conflict (id) do nothing;


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values
(
  'issue-files',
  'issue-files',
  false,
  20971520
)
on conflict (id) do nothing;


-- ============================================================
-- ISSUE MEDIA STORAGE POLICIES
--
-- Path format:
-- {user_id}/{issue_id}/{filename}
-- ============================================================

drop policy if exists "issue-media public read"
on storage.objects;

create policy "issue-media public read"
on storage.objects
for select
using (
  bucket_id = 'issue-media'
);


drop policy if exists "issue-media upload own"
on storage.objects;

create policy "issue-media upload own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-media'
  and (
    split_part(name, '/', 1)
    = auth.uid()::text
  )
);


drop policy if exists "issue-media delete own"
on storage.objects;

create policy "issue-media delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-media'
  and (
    split_part(name, '/', 1)
    = auth.uid()::text
  )
);


-- ============================================================
-- ISSUE FILE STORAGE POLICIES
--
-- Path format:
-- {user_id}/{issue_id}/{filename}
-- ============================================================

drop policy if exists "issue-files upload own"
on storage.objects;

create policy "issue-files upload own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-files'
  and (
    split_part(name, '/', 1)
    = auth.uid()::text
  )
);


drop policy if exists "issue-files read own"
on storage.objects;

create policy "issue-files read own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'issue-files'
  and (
    split_part(name, '/', 1)
    = auth.uid()::text
  )
);


drop policy if exists "issue-files delete own"
on storage.objects;

create policy "issue-files delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-files'
  and (
    split_part(name, '/', 1)
    = auth.uid()::text
  )
);


-- ============================================================
-- NEARBY ISSUES FUNCTION
--
-- Radius is in meters.
-- Default radius: 2 kilometres.
-- ============================================================

create or replace function nearby_issues(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision default 2000,
  result_limit integer default 20
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category issue_category,
  status issue_status,
  location_name text,
  latitude double precision,
  longitude double precision,
  support_count integer,
  created_at timestamptz,
  distance_meters double precision
)
language sql
stable
set search_path = public
as $$
  select
    i.id,
    i.user_id,
    i.title,
    i.description,
    i.category,
    i.status,
    i.location_name,
    i.latitude,
    i.longitude,
    i.support_count,
    i.created_at,

    (
      6371000 * acos(
        least(
          1.0,
          greatest(
            -1.0,

            cos(radians(user_lat))
            * cos(radians(i.latitude))
            * cos(
              radians(i.longitude)
              - radians(user_lng)
            )
            + sin(radians(user_lat))
            * sin(radians(i.latitude))
          )
        )
      )
    ) as distance_meters

  from issues i

  where
    (
      6371000 * acos(
        least(
          1.0,
          greatest(
            -1.0,

            cos(radians(user_lat))
            * cos(radians(i.latitude))
            * cos(
              radians(i.longitude)
              - radians(user_lng)
            )
            + sin(radians(user_lat))
            * sin(radians(i.latitude))
          )
        )
      )
    ) <= radius_meters

  order by distance_meters asc

  limit result_limit;
$$;

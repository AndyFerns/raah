-- Member status (active vs pending claim), website analysis metadata,
-- and RLS fixes that (a) let authenticated users search all institutions
-- for the claim flow and (b) prevent unauthorized self-promotion to admin.

set search_path = public;

-- ------------------------------------------------------------
-- institution_members.status: 'active' | 'pending'
-- Existing rows are treated as active.
-- ------------------------------------------------------------
alter table institution_members
  add column if not exists status text not null default 'active';

alter table institution_members
  drop constraint if exists institution_members_status_check;
alter table institution_members
  add constraint institution_members_status_check
  check (status in ('active', 'pending'));

-- ------------------------------------------------------------
-- Website analysis metadata on institutions.
-- ------------------------------------------------------------
alter table institutions
  add column if not exists website_analyzed_at timestamptz,
  add column if not exists website_analysis jsonb;

comment on column institutions.website_analysis is
  'Detected values extracted from the official website (used as a verification signal, never overwrites user data)';

-- ------------------------------------------------------------
-- RLS: allow authenticated users to see all institutions so the
-- claim/search flow works. Anonymous users retain the original policy
-- that only exposes verified institutions.
-- ------------------------------------------------------------
drop policy if exists institutions_authenticated_read on institutions;
create policy institutions_authenticated_read on institutions
  for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- RLS: tighten institution_members insert so a random user cannot
-- promote themselves to admin of an arbitrary institution.
-- ------------------------------------------------------------
drop policy if exists institution_members_insert on institution_members;
create policy institution_members_insert on institution_members
  for insert with check (
    -- Bootstrap: first member of a brand-new institution can insert themselves as admin.
    (
      user_id = auth.uid()
      and not exists (
        select 1 from institution_members m where m.institution_id = institution_members.institution_id
      )
    )
    -- Self-claim: any authenticated user may request membership as a pending member.
    or (user_id = auth.uid() and role = 'member' and status = 'pending')
    -- Existing admins may add anyone.
    or is_institution_admin(institution_id)
    or is_platform_admin()
  );

-- Allow institution admins to update member rows (approve pending → active,
-- promote to admin, etc.).
drop policy if exists institution_members_update on institution_members;
create policy institution_members_update on institution_members
  for update using (is_institution_admin(institution_id) or is_platform_admin())
  with check (is_institution_admin(institution_id) or is_platform_admin());

-- ------------------------------------------------------------
-- Let institution admins read the profiles of anyone (active OR pending)
-- who has a membership row in their institution, so they can review requests.
-- ------------------------------------------------------------
drop policy if exists profiles_institution_admin_select on profiles;
create policy profiles_institution_admin_select on profiles
  for select using (
    exists (
      select 1 from institution_members m
      where m.user_id = profiles.id
        and is_institution_admin(m.institution_id)
    )
  );

-- ------------------------------------------------------------
-- requireInstitutionMembership needs to only consider ACTIVE members.
-- Add an index that helps the common (user_id, status) lookup.
-- ------------------------------------------------------------
create index if not exists institution_members_user_status_idx
  on institution_members (user_id, status);

-- ------------------------------------------------------------
-- Refine the new-user trigger to pick up the requested_role and
-- full_name that the sign-up flow puts into raw_user_meta_data.
-- This is what lets us set a user's role at confirmation time,
-- before they log in (when a client-side profile update is impossible).
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  role_val app_role;
begin
  requested := coalesce(new.raw_user_meta_data->>'requested_role', 'citizen');
  begin
    role_val := requested::app_role;
  exception when others then
    role_val := 'citizen';
  end;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    role_val,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

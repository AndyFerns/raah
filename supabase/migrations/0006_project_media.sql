-- Project media (images) so the industry portal can display uploaded
-- prototype photos, diagrams, and other visuals attached to a project.
--
-- Two storage modes are supported:
--   - external_url:  full public URL (used by demo/seed data)
--   - storage_path:  Supabase storage object path in bucket 'project-media'
--
-- The Projects teammate will later own the upload flow. The industry UI
-- only reads this data.

set search_path = public;

create table if not exists project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  caption text,
  external_url text,
  storage_path text,
  mime_type text,
  ord smallint not null default 0,
  created_at timestamptz not null default now(),
  check (external_url is not null or storage_path is not null)
);

create index if not exists project_media_project_idx on project_media(project_id, ord);

alter table project_media enable row level security;

-- Read: media is public when the parent project is discoverable.
drop policy if exists project_media_read on project_media;
create policy project_media_read on project_media
  for select using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (p.discoverable = true or is_platform_admin())
    )
  );

-- Write: platform admins only for now; the Projects teammate will extend
-- this to project owners when the upload flow lands.
drop policy if exists project_media_admin_write on project_media;
create policy project_media_admin_write on project_media
  for all using (is_platform_admin())
  with check (is_platform_admin());

-- Public storage bucket for future uploads. External URLs don't use this.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-media', 'project-media', true, 52428800)
on conflict (id) do nothing;

-- Read is fully public (bucket is public). Write is restricted at
-- app-server level via service-role until the Projects module lands.
drop policy if exists "project-media public read" on storage.objects;
create policy "project-media public read" on storage.objects
  for select using (bucket_id = 'project-media');

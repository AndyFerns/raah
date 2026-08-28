-- Allow government users to update any issue
create policy issues_government_update
on issues
for update
to authenticated
using (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'government'
  )
);

-- Allow government users to insert evidence media for any issue
create policy issue_media_government_insert
on issue_media
for insert
to authenticated
with check (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'government'
  )
);

-- Allow government users to upload to the issue-media bucket under the government/ prefix
create policy "issue-media upload government"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-media'
  and split_part(name, '/', 1) = 'government'
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'government'
  )
);

-- Server-side cache for the generic web scraper.
-- Keyed by a caller-supplied string (typically "<extractor>:<host>"), so it
-- can back the institution website analyzer today and any other scraper
-- consumer later without a schema change.

set search_path = public;

create table if not exists scrape_cache (
  key text primary key,
  value jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists scrape_cache_expires_idx on scrape_cache (expires_at);

-- Only the service role reads/writes this cache. No RLS policies are
-- required because RLS is not enabled — the table is server-only and never
-- accessed with an end-user JWT.
comment on table scrape_cache is
  'Server-side cache for generic web-scrape results. Access via service-role client only.';

// Server-side cache backed by the public.scrape_cache table.
// Keyed by a caller-supplied string so any extractor can namespace freely.
//
// Access requires the service role — this is deliberately a server-only
// component and must never be imported from a client component.

import { createSupabaseServiceRoleClient } from "../supabase/server";

export interface ScrapeCache {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlHours: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

export function createSupabaseScrapeCache(): ScrapeCache {
  const admin = createSupabaseServiceRoleClient();
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const { data } = await admin
        .from("scrape_cache")
        .select("value, expires_at")
        .eq("key", key)
        .maybeSingle();
      if (!data) return null;
      if (new Date(data.expires_at).getTime() < Date.now()) return null;
      return data.value as T;
    },
    async set(key: string, value: unknown, ttlHours: number): Promise<void> {
      const expiresAt = new Date(
        Date.now() + Math.max(1, ttlHours) * 60 * 60 * 1000
      ).toISOString();
      await admin
        .from("scrape_cache")
        .upsert(
          {
            key,
            value: value as never,
            fetched_at: new Date().toISOString(),
            expires_at: expiresAt,
          },
          { onConflict: "key" }
        );
    },
    async invalidate(key: string): Promise<void> {
      await admin.from("scrape_cache").delete().eq("key", key);
    },
  };
}

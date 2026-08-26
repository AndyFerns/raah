import Link from "next/link";
import { Container, EmptyState } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INSTITUTION_TYPE_LABEL } from "@/lib/supabase/types";

export const metadata = { title: "Institutions — Raah" };

const TONES = [
  "bg-[color:var(--surface)]",
  "bg-[color:var(--surface-2)]",
  "bg-[color:var(--surface-3)]",
] as const;

const RULES = [
  "bg-[color:var(--accent)]",
  "bg-[color:var(--accent-2)]",
] as const;

export default async function InstitutionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("institutions")
    .select("id, slug, name, type, city, district, description")
    .eq("verification_status", "verified")
    .order("name");

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-[color:var(--surface)]">
        <div className="absolute inset-0 opacity-70 bg-dots pointer-events-none" />
        <Container className="relative py-16 md:py-20">
          <p className="eyebrow mb-4 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[color:var(--accent)]" />
            Institutions
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Verified institutions on Raah
          </h1>
          <p className="mt-3 text-muted max-w-2xl">
            Universities, colleges, polytechnics and research institutions that
            have been verified to work on societal challenges.
          </p>
        </Container>
      </section>

      <Container className="py-14">
        {(data ?? []).length === 0 ? (
          <EmptyState
            title="No verified institutions yet."
            description="Institutions appear here once they complete verification."
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data ?? []).map((i, idx) => (
              <li key={i.id}>
                <Link
                  href={`/institutions/${i.slug}`}
                  className={`group block h-full border border-border ${TONES[idx % TONES.length]} p-6 hover:border-border-strong transition-colors`}
                >
                  <div className={`h-0.5 w-10 mb-6 ${RULES[idx % RULES.length]}`} />
                  <p className="eyebrow mb-2">
                    {INSTITUTION_TYPE_LABEL[i.type as keyof typeof INSTITUTION_TYPE_LABEL]}
                  </p>
                  <p className="text-lg font-semibold text-foreground group-hover:underline underline-offset-4">
                    {i.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {[i.city, i.district].filter(Boolean).join(", ") || "Location not set"}
                  </p>
                  {i.description && (
                    <p className="mt-4 text-sm text-muted leading-relaxed line-clamp-3">
                      {i.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}

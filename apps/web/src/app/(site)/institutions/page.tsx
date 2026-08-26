import Link from "next/link";
import { Card, Container, EmptyState } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INSTITUTION_TYPE_LABEL } from "@/lib/supabase/types";

export const metadata = { title: "Institutions — Raah" };

export default async function InstitutionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("institutions")
    .select("id, slug, name, type, city, district, description")
    .eq("verification_status", "verified")
    .order("name");

  return (
    <Container className="py-14">
      <p className="eyebrow mb-3">Institutions</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
        Verified institutions on Raah
      </h1>
      <p className="mt-3 text-muted max-w-2xl">
        Universities, colleges, polytechnics and research institutions that
        have been verified to work on societal challenges.
      </p>

      <div className="mt-12">
        {(data ?? []).length === 0 ? (
          <EmptyState
            title="No verified institutions yet."
            description="Institutions appear here once they complete verification."
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(data ?? []).map((i) => (
              <li key={i.id}>
                <Card className="p-6 h-full">
                  <p className="eyebrow mb-2">
                    {INSTITUTION_TYPE_LABEL[i.type as keyof typeof INSTITUTION_TYPE_LABEL]}
                  </p>
                  <Link
                    href={`/institutions/${i.slug}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {i.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {[i.city, i.district].filter(Boolean).join(", ") || "Location not set"}
                  </p>
                  {i.description && (
                    <p className="mt-3 text-sm text-muted leading-relaxed line-clamp-3">
                      {i.description}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

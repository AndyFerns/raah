/**
 * Interface for the future challenge → institution matching service.
 * The real implementation will live behind ML_SERVICE_URL and be owned by
 * another team. This module exposes ONLY:
 *   - the recommendation return type
 *   - a data accessor that provides the structured institution capability
 *     signals a matching service will need
 *
 * It does not implement scoring. The Institution Capability Score in
 * `capability.ts` is a general institutional-strength signal, distinct from
 * the challenge-specific match score the matching service will produce.
 */

import { createSupabaseServiceRoleClient } from "./supabase/server";

export type InstitutionRecommendation = {
  institutionId: string;
  score: number;
  reasons: string[];
};

export type InstitutionCapabilityData = {
  institutionId: string;
  name: string;
  slug: string;
  type: string;
  departments: string[];
  researchAreas: string[];
  capabilities: string[];
  facilities: { name: string; type: string; description: string | null }[];
  facultyExpertise: string[];
  facultyCount: number;
  verifiedFacultyCount: number;
  verificationStatus: string;
};

export async function getInstitutionRecommendations(
  challengeId: string
): Promise<InstitutionRecommendation[]> {
  void challengeId;
  return [];
}

/**
 * Data accessor for the future matching service. Returns structured
 * capability data for all verified institutions, or for one specific
 * institution by id. Uses the service-role client because the matching
 * pipeline runs server-side and needs to read across institutions.
 */
export async function getInstitutionCapabilityData(
  institutionId?: string
): Promise<InstitutionCapabilityData[]> {
  const admin = createSupabaseServiceRoleClient();

  let q = admin
    .from("institutions")
    .select(
      `id, name, slug, type, verification_status,
       departments(name),
       institution_research_areas(area),
       institution_capabilities(capability),
       institution_facilities(name, description, facility_type),
       faculty(expertise)`
    )
    .eq("verification_status", "verified");

  if (institutionId) {
    q = q.eq("id", institutionId);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((row) => {
    const r = row as unknown as {
      id: string;
      name: string;
      slug: string;
      type: string;
      verification_status: string;
      departments: { name: string }[] | null;
      institution_research_areas: { area: string }[] | null;
      institution_capabilities: { capability: string }[] | null;
      institution_facilities:
        | { name: string; description: string | null; facility_type: string }[]
        | null;
      faculty: { expertise: string[] | null }[] | null;
    };
    const facultyExpertise = (r.faculty ?? [])
      .flatMap((f) => f.expertise ?? [])
      .filter((v, i, a) => a.indexOf(v) === i);
    return {
      institutionId: r.id,
      name: r.name,
      slug: r.slug,
      type: r.type,
      departments: (r.departments ?? []).map((d) => d.name),
      researchAreas: (r.institution_research_areas ?? []).map((x) => x.area),
      capabilities: (r.institution_capabilities ?? []).map((x) => x.capability),
      facilities: (r.institution_facilities ?? []).map((f) => ({
        name: f.name,
        type: f.facility_type,
        description: f.description,
      })),
      facultyExpertise,
      facultyCount: (r.faculty ?? []).length,
      verifiedFacultyCount: 0,
      verificationStatus: r.verification_status,
    };
  });
}

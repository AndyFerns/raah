import type { Institution } from "./supabase/types";

export const CAPABILITY_WEIGHTS = {
  verification: 20,
  research: 25,
  faculty: 20,
  infrastructure: 15,
  projects: 10,
  industry: 5,
  profile: 5,
} as const;

export type CapabilityBreakdown = {
  verification: { score: number; max: number };
  research: { score: number; max: number };
  faculty: { score: number; max: number };
  infrastructure: { score: number; max: number };
  projects: { score: number; max: number };
  industry: { score: number; max: number };
  profile: { score: number; max: number };
  total: number;
};

export function computeCapability(input: {
  institution: Pick<
    Institution,
    | "verification_status"
    | "description"
    | "website"
    | "official_domain"
    | "website_analyzed_at"
  >;
  researchAreas: number;
  facultyVerified: number;
  facultyTotal: number;
  facilities: number;
  capabilities: number;
  activeProjects?: number;
  industryPartners?: number;
}): CapabilityBreakdown {
  const w = CAPABILITY_WEIGHTS;

  // Verification score: platform review is the strongest signal, but a
  // successful website analysis adds a small confidence boost even before
  // an admin has reviewed the institution.
  const websiteSignal = input.institution.website_analyzed_at ? 1 : 0;
  const verificationBase =
    input.institution.verification_status === "verified"
      ? w.verification
      : input.institution.verification_status === "under_review"
        ? Math.round(w.verification * 0.4)
        : 0;
  const verification = Math.min(
    w.verification,
    verificationBase + websiteSignal * 2
  );

  const research = Math.min(input.researchAreas, 5) * (w.research / 5);
  const faculty =
    input.facultyTotal === 0
      ? 0
      : Math.round(
          (input.facultyVerified / input.facultyTotal) * w.faculty
        );
  const infrastructure = Math.min(input.facilities, 5) * (w.infrastructure / 5);

  const projectSignal = (input.activeProjects ?? 0) + input.capabilities;
  const projects = Math.min(projectSignal, 10) * (w.projects / 10);

  const industry = Math.min(input.industryPartners ?? 0, 5) * (w.industry / 5);

  const profileFilled =
    [input.institution.description, input.institution.website, input.institution.official_domain]
      .filter(Boolean).length;
  const profile = Math.round((profileFilled / 3) * w.profile);

  const round = (n: number) => Math.round(n);
  const b = {
    verification: { score: round(verification), max: w.verification },
    research: { score: round(research), max: w.research },
    faculty: { score: round(faculty), max: w.faculty },
    infrastructure: { score: round(infrastructure), max: w.infrastructure },
    projects: { score: round(projects), max: w.projects },
    industry: { score: round(industry), max: w.industry },
    profile: { score: round(profile), max: w.profile },
    total: 0,
  };
  b.total =
    b.verification.score +
    b.research.score +
    b.faculty.score +
    b.infrastructure.score +
    b.projects.score +
    b.industry.score +
    b.profile.score;
  return b;
}

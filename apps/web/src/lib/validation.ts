import { z } from "zod";

// Institution identity fields required to submit a new-institution registration.
// The requirement is that a malicious client cannot submit a nearly empty profile;
// the platform relies on these fields to establish institutional identity.
export const InstitutionRegistrationSchema = z.object({
  name: z.string().min(3, "Institution name is required").max(200),
  type: z.enum([
    "university",
    "engineering_college",
    "degree_college",
    "polytechnic",
    "research_institution",
    "other_hei",
  ]),
  institution_code: z.string().max(60).optional().nullable(),
  official_email: z.email("A valid official email is required"),
  website: z
    .string()
    .min(4, "Official website is required")
    .max(300)
    .refine((v) => /^https?:\/\//i.test(v), {
      message: "Website must start with http:// or https://",
    }),
  state: z.string().min(2, "State is required").max(80),
  district: z.string().min(2, "District is required").max(80),
  city: z.string().min(2, "City is required").max(80),
  address: z.string().max(500).optional().nullable(),
  description: z
    .string()
    .min(30, "Please describe the institution in at least 30 characters")
    .max(2000),
});

// Profile edits can be partial (an institution admin may update one field at a time).
export const InstitutionProfileSchema = InstitutionRegistrationSchema.partial();

export const IndustryOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name is required").max(200),
  type: z.enum([
    "startup",
    "msme",
    "company",
    "csr",
    "research_org",
    "innovation_partner",
    "other",
  ]),
  website: z.string().max(300).optional().nullable(),
  official_email: z.email().optional().nullable().or(z.literal("")),
  state: z.string().max(80).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const IndustryProfileSchema = z.object({
  scope_domains: z.array(z.string().max(120)).max(30),
  expertise: z.array(z.string().max(120)).max(30),
  support_capabilities: z.array(z.string().max(60)).max(15),
  investment_interest: z.enum([
    "not_interested",
    "interested",
    "actively_seeking",
  ]),
  investment_range_min: z.number().int().min(0).nullable().optional(),
  investment_range_max: z.number().int().min(0).nullable().optional(),
  preferred_locations: z.array(z.string().max(120)).max(30),
  notes: z.string().max(2000).optional().nullable(),
});

export const SupportOfferSchema = z.object({
  project_id: z.uuid(),
  support_type: z.enum([
    "technical_support",
    "funding",
    "mentorship",
    "prototyping",
    "testing",
    "deployment",
    "infrastructure",
    "other",
  ]),
  description: z.string().max(2000).optional().nullable(),
  expected_involvement: z.string().max(1000).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  // Funding
  funding_type: z.string().max(120).optional().nullable(),
  funding_amount_min: z.number().int().min(0).nullable().optional(),
  funding_amount_max: z.number().int().min(0).nullable().optional(),
  funding_conditions: z.string().max(2000).optional().nullable(),
  // Mentorship
  mentor_name: z.string().max(200).optional().nullable(),
  mentor_expertise: z.string().max(500).optional().nullable(),
  mentor_availability: z.string().max(200).optional().nullable(),
  engagement_mode: z.string().max(200).optional().nullable(),
  contact_person: z.string().max(200).optional().nullable(),
});

export const FacultyInviteSchema = z.object({
  full_name: z.string().min(2).max(200),
  designation: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  official_email: z.email(),
  expertise: z.array(z.string().max(120)).max(20).optional().nullable(),
});

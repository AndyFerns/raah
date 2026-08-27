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

export const FacultyInviteSchema = z.object({
  full_name: z.string().min(2).max(200),
  designation: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  official_email: z.email(),
  expertise: z.array(z.string().max(120)).max(20).optional().nullable(),
});

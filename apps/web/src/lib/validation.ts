import { z } from "zod";

export const InstitutionRegistrationSchema = z.object({
  name: z.string().min(3).max(200),
  type: z.enum([
    "university",
    "engineering_college",
    "degree_college",
    "polytechnic",
    "research_institution",
    "other_hei",
  ]),
  institution_code: z.string().max(60).optional().nullable(),
  official_email: z.email().optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const InstitutionProfileSchema = InstitutionRegistrationSchema.partial();

export const FacultyInviteSchema = z.object({
  full_name: z.string().min(2).max(200),
  designation: z.string().max(120).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  official_email: z.email(),
  expertise: z.array(z.string().max(120)).max(20).optional().nullable(),
});

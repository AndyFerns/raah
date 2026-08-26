export type AppRole =
  | "citizen"
  | "community"
  | "panchayat"
  | "government"
  | "institution"
  | "faculty"
  | "student"
  | "industry"
  | "csr"
  | "research_org"
  | "admin";

export type InstitutionType =
  | "university"
  | "engineering_college"
  | "degree_college"
  | "polytechnic"
  | "research_institution"
  | "other_hei";

export type VerificationStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
  | "suspended";

export type FacultyVerificationStatus =
  | "pending"
  | "sent"
  | "verified"
  | "expired"
  | "revoked";

export type Profile = {
  id: string;
  role: AppRole;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type Institution = {
  id: string;
  slug: string;
  name: string;
  type: InstitutionType;
  institution_code: string | null;
  official_email: string | null;
  official_domain: string | null;
  website: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_by: string | null;
  website_analyzed_at: string | null;
  website_analysis: WebsiteAnalysis | null;
  created_at: string;
  updated_at: string;
};

export type MembershipStatus = "active" | "pending";

export type WebsiteAnalysis = {
  source_url: string;
  fetched_at: string;
  ok: boolean;
  detected: {
    title?: string | null;
    description?: string | null;
    address_hint?: string | null;
    departments?: string[];
    keywords?: string[];
  };
  notes?: string | null;
};

export type Faculty = {
  id: string;
  institution_id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  official_email: string;
  expertise: string[] | null;
  user_id: string | null;
  created_at: string;
};

export type FacilityType =
  | "facility"
  | "laboratory"
  | "research_centre"
  | "incubation_centre"
  | "innovation_centre";

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  facility: "Facility",
  laboratory: "Laboratory",
  research_centre: "Research Centre",
  incubation_centre: "Incubation Centre",
  innovation_centre: "Innovation Centre",
};

export type FacultyVerification = {
  id: string;
  faculty_id: string;
  status: FacultyVerificationStatus;
  token: string | null;
  token_expires_at: string | null;
  method: string | null;
  sent_at: string | null;
  verified_at: string | null;
  created_at: string;
};

export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  university: "University",
  engineering_college: "Engineering College",
  degree_college: "Degree College",
  polytechnic: "Polytechnic",
  research_institution: "Research Institution",
  other_hei: "Other Higher Education Institution",
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  citizen: "Citizen",
  community: "Community / NGO",
  panchayat: "Panchayat / Local Body",
  government: "Government / Public Body",
  institution: "Institution",
  faculty: "Faculty",
  student: "Student",
  industry: "Industry / Startup / MSME",
  csr: "CSR Organization",
  research_org: "Research / Innovation",
  admin: "Platform Administrator",
};

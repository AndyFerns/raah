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

export type IndustryOrganizationType =
  | "startup"
  | "msme"
  | "company"
  | "csr"
  | "research_org"
  | "innovation_partner"
  | "other";

export type ProjectStage =
  | "idea"
  | "research"
  | "prototype"
  | "pilot"
  | "deployment"
  | "completed";

export type CollaborationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "completed";

export type SupportOfferType =
  | "technical_support"
  | "funding"
  | "mentorship"
  | "prototyping"
  | "testing"
  | "deployment"
  | "infrastructure"
  | "other";

export type InvestmentInterest =
  | "not_interested"
  | "interested"
  | "actively_seeking";

export type IndustryOrganization = {
  id: string;
  slug: string;
  name: string;
  type: IndustryOrganizationType;
  website: string | null;
  official_email: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  description: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IndustryProfile = {
  organization_id: string;
  scope_domains: string[];
  expertise: string[];
  support_capabilities: string[];
  investment_interest: InvestmentInterest;
  investment_range_min: number | null;
  investment_range_max: number | null;
  preferred_locations: string[];
  notes: string | null;
  updated_at: string;
};

export type Project = {
  id: string;
  title: string;
  problem_statement: string | null;
  domain: string | null;
  institution_id: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  stage: ProjectStage;
  progress: number;
  seeking_support: SupportOfferType[];
  required_expertise: string[];
  collaboration_types: string[];
  faculty_mentor_name: string | null;
  faculty_mentor_department: string | null;
  faculty_mentor_expertise: string | null;
  faculty_mentor_email: string | null;
  contact_email: string | null;
  mentorship_details: string | null;
  mentorship_mode: string | null;
  mentorship_availability: string | null;
  latest_update: string | null;
  next_milestone: string | null;
  discoverable: boolean;
  status: "draft" | "active" | "on_hold" | "completed" | "archived";
  created_at: string;
  updated_at: string;
};

export type ProjectMilestone = {
  id: string;
  project_id: string;
  label: string;
  ord: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type ProjectMedia = {
  id: string;
  project_id: string;
  caption: string | null;
  external_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  ord: number;
  created_at: string;
};

export type ProjectSupportOffer = {
  id: string;
  project_id: string;
  organization_id: string;
  created_by: string | null;
  support_type: SupportOfferType;
  description: string | null;
  expected_involvement: string | null;
  duration: string | null;
  funding_type: string | null;
  funding_amount_min: number | null;
  funding_amount_max: number | null;
  funding_conditions: string | null;
  mentor_name: string | null;
  mentor_expertise: string | null;
  mentor_availability: string | null;
  engagement_mode: string | null;
  contact_person: string | null;
  status: CollaborationStatus;
  created_at: string;
  updated_at: string;
};

export const INDUSTRY_ORG_TYPE_LABEL: Record<IndustryOrganizationType, string> = {
  startup: "Startup",
  msme: "MSME",
  company: "Company",
  csr: "CSR Organization",
  research_org: "Research / Innovation Organization",
  innovation_partner: "Innovation Partner",
  other: "Other",
};

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
  idea: "Idea",
  research: "Research",
  prototype: "Prototype",
  pilot: "Pilot",
  deployment: "Deployment",
  completed: "Completed",
};

export const SUPPORT_TYPE_LABEL: Record<SupportOfferType, string> = {
  technical_support: "Technical Support",
  funding: "Funding",
  mentorship: "Mentorship",
  prototyping: "Prototyping",
  testing: "Testing",
  deployment: "Deployment",
  infrastructure: "Infrastructure",
  other: "Other",
};

export const COLLABORATION_STATUS_LABEL: Record<CollaborationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  completed: "Completed",
};

export const INVESTMENT_INTEREST_LABEL: Record<InvestmentInterest, string> = {
  not_interested: "Not interested",
  interested: "Interested",
  actively_seeking: "Actively seeking projects",
};

export const INDUSTRY_ROLES: readonly AppRole[] = [
  "industry",
  "csr",
  "research_org",
] as const;

export const SCOPE_DOMAINS = [
  "Agriculture",
  "Healthcare",
  "Education",
  "Water",
  "Environment",
  "Energy",
  "Accessibility",
  "Rural livelihoods",
  "Urban infrastructure",
  "Public services",
] as const;

export const EXPERTISE_AREAS = [
  "AI/ML",
  "IoT",
  "Robotics",
  "Software",
  "Hardware",
  "Civil engineering",
  "Agriculture",
  "Healthcare technology",
  "Manufacturing",
  "Renewable energy",
  "Data science",
] as const;

export const SUPPORT_CAPABILITIES: SupportOfferType[] = [
  "technical_support",
  "funding",
  "mentorship",
  "prototyping",
  "testing",
  "deployment",
  "infrastructure",
];

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

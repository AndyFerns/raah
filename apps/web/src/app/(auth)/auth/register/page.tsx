import Link from "next/link";
import { RegisterForm } from "./register-form";
import type { AppRole } from "@/lib/supabase/types";

export const metadata = { title: "Create account — Raah" };

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  {
    value: "citizen",
    label: "Citizen",
    description: "Individual account for community members.",
  },
  {
    value: "institution",
    label: "Institution",
    description: "University, college, polytechnic or research institution.",
  },
  {
    value: "government",
    label: "Government / Public Body",
    description: "Government department, district administration, agency.",
  },
  {
    value: "community",
    label: "Community / NGO",
    description: "Community group, NGO, registered local organization.",
  },
  {
    value: "industry",
    label: "Industry / Startup / MSME",
    description: "Company, startup or MSME.",
  },
  {
    value: "faculty",
    label: "Faculty",
    description: "Faculty member of an institution.",
  },
  {
    value: "student",
    label: "Student",
    description: "Student of an institution.",
  },
];

type SearchParams = { role?: string };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const preselected = ROLE_OPTIONS.find((r) => r.value === sp.role);

  return (
    <div>
      <p className="eyebrow mb-3">Raah</p>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        Choose the type of account, then create your login.
      </p>
      <div className="mt-8">
        <RegisterForm
          roleOptions={ROLE_OPTIONS}
          initialRole={preselected?.value}
        />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

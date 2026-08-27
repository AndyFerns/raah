"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  INDUSTRY_ORG_TYPE_LABEL,
  type IndustryOrganizationType,
} from "@/lib/supabase/types";
import { registerIndustryOrganizationAction } from "../actions";

const TYPES: IndustryOrganizationType[] = [
  "startup",
  "msme",
  "company",
  "csr",
  "research_org",
  "innovation_partner",
  "other",
];

export function OnboardingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await registerIndustryOrganizationAction(fd);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          router.push("/industry/interests");
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Field label="Organization name" htmlFor="name">
          <Input id="name" name="name" required minLength={2} />
        </Field>
        <Field label="Organization type" htmlFor="type">
          <Select id="type" name="type" defaultValue="startup" required>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {INDUSTRY_ORG_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Website"
          htmlFor="website"
          hint="Optional — public site or landing page."
        >
          <Input id="website" name="website" placeholder="https://" />
        </Field>
        <Field label="Official email" htmlFor="official_email">
          <Input id="official_email" name="official_email" type="email" />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" />
        </Field>
        <Field label="District" htmlFor="district">
          <Input id="district" name="district" />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" />
        </Field>
      </div>
      <Field
        label="Short description"
        htmlFor="description"
        hint="What does your organization do? What kind of projects would you support?"
      >
        <Textarea id="description" name="description" />
      </Field>

      {error && (
        <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Continue"}
      </Button>
    </form>
  );
}

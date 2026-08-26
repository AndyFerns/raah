"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { registerInstitutionAction } from "./actions";
import { INSTITUTION_TYPE_LABEL, type InstitutionType } from "@/lib/supabase/types";

const TYPES: InstitutionType[] = [
  "university",
  "engineering_college",
  "degree_college",
  "polytechnic",
  "research_institution",
  "other_hei",
];

export function InstitutionRegistrationForm() {
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
          const res = await registerInstitutionAction(fd);
          if (res && "error" in res) {
            setError(res.error);
            return;
          }
          router.push("/institution/verification");
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Field label="Institution name" htmlFor="name">
          <Input id="name" name="name" required />
        </Field>
        <Field label="Institution type" htmlFor="type">
          <Select id="type" name="type" defaultValue="university" required>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {INSTITUTION_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Institution code"
          htmlFor="institution_code"
          hint="Optional — AICTE, UGC or similar code, if applicable."
        >
          <Input id="institution_code" name="institution_code" />
        </Field>
        <Field label="Official email" htmlFor="official_email">
          <Input id="official_email" name="official_email" type="email" />
        </Field>
        <Field
          label="Official website"
          htmlFor="website"
          hint="Used to derive the official domain."
        >
          <Input id="website" name="website" placeholder="https://" />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" defaultValue="Jharkhand" />
        </Field>
        <Field label="District" htmlFor="district">
          <Input id="district" name="district" />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" />
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Textarea id="address" name="address" />
      </Field>
      <Field label="Short description" htmlFor="description">
        <Textarea id="description" name="description" />
      </Field>
      {error && (
        <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Continue to verification"}
        </Button>
      </div>
    </form>
  );
}

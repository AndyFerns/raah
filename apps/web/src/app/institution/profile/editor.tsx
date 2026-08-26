"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  INSTITUTION_TYPE_LABEL,
  type Institution,
  type InstitutionType,
} from "@/lib/supabase/types";
import { updateInstitutionProfileAction } from "./actions";

const TYPES: InstitutionType[] = [
  "university",
  "engineering_college",
  "degree_college",
  "polytechnic",
  "research_institution",
  "other_hei",
];

export function InstitutionProfileEditor({
  institution,
}: {
  institution: Institution;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok?: boolean; error?: string }>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setState({});
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateInstitutionProfileAction(institution.id, fd);
          if ("error" in res) setState({ error: res.error });
          else setState({ ok: true });
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Field label="Institution name" htmlFor="name">
          <Input id="name" name="name" defaultValue={institution.name} />
        </Field>
        <Field label="Institution type" htmlFor="type">
          <Select id="type" name="type" defaultValue={institution.type}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {INSTITUTION_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Institution code" htmlFor="institution_code">
          <Input
            id="institution_code"
            name="institution_code"
            defaultValue={institution.institution_code ?? ""}
          />
        </Field>
        <Field label="Official email" htmlFor="official_email">
          <Input
            id="official_email"
            name="official_email"
            type="email"
            defaultValue={institution.official_email ?? ""}
          />
        </Field>
        <Field label="Official website" htmlFor="website">
          <Input
            id="website"
            name="website"
            defaultValue={institution.website ?? ""}
          />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" defaultValue={institution.state ?? ""} />
        </Field>
        <Field label="District" htmlFor="district">
          <Input
            id="district"
            name="district"
            defaultValue={institution.district ?? ""}
          />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={institution.city ?? ""} />
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Textarea
          id="address"
          name="address"
          defaultValue={institution.address ?? ""}
        />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          defaultValue={institution.description ?? ""}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.ok && <span className="text-sm text-[color:var(--success)]">Saved.</span>}
        {state.error && (
          <span className="text-sm text-[color:var(--danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}

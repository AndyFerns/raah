"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { addFacultyAction } from "./actions";

export function AddFacultyForm({
  institutionId,
  institutionDomain,
}: {
  institutionId: string;
  institutionDomain: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const res = await addFacultyAction(institutionId, fd);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          form.reset();
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" name="full_name" required />
        </Field>
        <Field label="Official email" htmlFor="official_email">
          <Input
            id="official_email"
            name="official_email"
            type="email"
            required
            placeholder={
              institutionDomain ? `name@${institutionDomain}` : "name@example.ac.in"
            }
          />
        </Field>
        <Field label="Designation" htmlFor="designation">
          <Input id="designation" name="designation" />
        </Field>
        <Field label="Department" htmlFor="department">
          <Input id="department" name="department" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Expertise / research areas" htmlFor="expertise">
            <Input
              id="expertise"
              name="expertise"
              placeholder="AI, Water Resources, IoT (comma-separated)"
            />
          </Field>
        </div>
      </div>
      {!institutionDomain && (
        <p className="mb-4 text-xs text-[color:var(--warning)]">
          Set your institution&apos;s official website or email in the profile
          so Raah can verify faculty by domain.
        </p>
      )}
      {error && <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add faculty"}
      </Button>
    </form>
  );
}

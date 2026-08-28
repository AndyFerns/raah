"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { Button, Card, Chip, Field, Input, Select, StatusPill, Textarea } from "@/components/ui";
import { CoinIcon, GraduationIcon, SparkleIcon } from "@/components/icons";
import {
  SUPPORT_TYPE_LABEL,
  type SupportOfferType,
} from "@/lib/supabase/types";
import { submitSupportOfferAction } from "@/app/(app)/industry/actions";

type OfferKind = "technical_support" | "funding" | "mentorship";

const KIND_LABEL: Record<OfferKind, string> = {
  technical_support: "Technical support",
  funding: "Funding",
  mentorship: "Mentorship",
};

const KIND_ICON: Record<OfferKind, ReactNode> = {
  technical_support: <SparkleIcon size={14} />,
  funding: <CoinIcon size={14} />,
  mentorship: <GraduationIcon size={14} />,
};

export function OfferPanel({
  projectId,
  organizationName,
  existingOffers,
}: {
  projectId: string;
  organizationName: string;
  existingOffers: { id: string; support_type: string; status: string }[];
}) {
  const [kind, setKind] = useState<OfferKind | null>(null);

  return (
    <Card tone="blush" className="p-5">
      <p className="eyebrow mb-3">Support this project</p>
      {existingOffers.length > 0 && (
        <ul className="mb-4 space-y-2">
          {existingOffers.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between text-xs bg-[color:var(--surface)] rounded-xl border border-[color:var(--border)] px-3 py-2"
            >
              <Chip>
                {SUPPORT_TYPE_LABEL[o.support_type as SupportOfferType]}
              </Chip>
              <StatusPill status={o.status} />
            </li>
          ))}
        </ul>
      )}

      {kind === null && (
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(KIND_LABEL) as OfferKind[]).map((k) => (
            <Button
              key={k}
              type="button"
              variant="secondary"
              onClick={() => setKind(k)}
              className="justify-start"
            >
              {KIND_ICON[k]}
              <span className="ml-1">{KIND_LABEL[k]}</span>
            </Button>
          ))}
        </div>
      )}

      {kind !== null && (
        <OfferForm
          projectId={projectId}
          kind={kind}
          organizationName={organizationName}
          onCancel={() => setKind(null)}
        />
      )}
    </Card>
  );
}

function OfferForm({
  projectId,
  kind,
  organizationName,
  onCancel,
}: {
  projectId: string;
  kind: OfferKind;
  organizationName: string;
  onCancel: () => void;
}) {
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
          const res = await submitSupportOfferAction(fd);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          onCancel();
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="support_type" value={kind} />
      <p className="text-xs text-muted mb-4">
        Offering as{" "}
        <span className="font-medium text-foreground">{organizationName}</span>
      </p>

      {kind === "technical_support" && (
        <>
          <Field label="Support area" htmlFor="funding_type">
            <Input
              id="funding_type"
              name="funding_type"
              placeholder="e.g. IoT, embedded systems"
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" required />
          </Field>
          <Field
            label="Expected involvement"
            htmlFor="expected_involvement"
          >
            <Textarea
              id="expected_involvement"
              name="expected_involvement"
            />
          </Field>
          <Field label="Duration" htmlFor="duration">
            <Input id="duration" name="duration" placeholder="e.g. 3 months" />
          </Field>
        </>
      )}

      {kind === "funding" && (
        <>
          <Field label="Funding type" htmlFor="funding_type">
            <Select
              id="funding_type"
              name="funding_type"
              defaultValue="grant"
            >
              <option value="grant">Grant</option>
              <option value="seed">Seed</option>
              <option value="equity">Equity</option>
              <option value="csr">CSR</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Amount min (INR)" htmlFor="funding_amount_min">
              <Input
                id="funding_amount_min"
                name="funding_amount_min"
                type="number"
                min={0}
              />
            </Field>
            <Field label="Amount max (INR)" htmlFor="funding_amount_max">
              <Input
                id="funding_amount_max"
                name="funding_amount_max"
                type="number"
                min={0}
              />
            </Field>
          </div>
          <Field label="Purpose" htmlFor="description">
            <Textarea id="description" name="description" required />
          </Field>
          <Field label="Conditions" htmlFor="funding_conditions">
            <Textarea id="funding_conditions" name="funding_conditions" />
          </Field>
          <Field label="Contact person" htmlFor="contact_person">
            <Input id="contact_person" name="contact_person" />
          </Field>
          <p className="mb-4 text-xs text-muted">
            This is an expression of interest only. No transaction occurs.
          </p>
        </>
      )}

      {kind === "mentorship" && (
        <>
          <Field label="Mentor name" htmlFor="mentor_name">
            <Input id="mentor_name" name="mentor_name" required />
          </Field>
          <Field label="Expertise" htmlFor="mentor_expertise">
            <Input
              id="mentor_expertise"
              name="mentor_expertise"
              placeholder="e.g. Embedded systems, IoT"
            />
          </Field>
          <Field label="Availability" htmlFor="mentor_availability">
            <Input
              id="mentor_availability"
              name="mentor_availability"
              placeholder="e.g. 4 hours / week"
            />
          </Field>
          <Field label="Engagement mode" htmlFor="engagement_mode">
            <Select id="engagement_mode" name="engagement_mode">
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" required />
          </Field>
        </>
      )}

      {error && (
        <p className="mb-3 text-sm text-[color:var(--danger)]">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit offer"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

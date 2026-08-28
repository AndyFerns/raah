"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  EXPERTISE_AREAS,
  INVESTMENT_INTEREST_LABEL,
  SCOPE_DOMAINS,
  SUPPORT_CAPABILITIES,
  SUPPORT_TYPE_LABEL,
  type IndustryProfile,
  type InvestmentInterest,
} from "@/lib/supabase/types";
import { saveIndustryProfileAction } from "../actions";

const INVESTMENT_OPTIONS: InvestmentInterest[] = [
  "not_interested",
  "interested",
  "actively_seeking",
];

export function InterestsForm({
  profile,
}: {
  profile: IndustryProfile | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initial = {
    scope_domains: profile?.scope_domains ?? [],
    expertise: profile?.expertise ?? [],
    support_capabilities: profile?.support_capabilities ?? [],
    investment_interest: profile?.investment_interest ?? "not_interested",
    investment_range_min: profile?.investment_range_min ?? null,
    investment_range_max: profile?.investment_range_max ?? null,
    preferred_locations: profile?.preferred_locations ?? [],
    notes: profile?.notes ?? "",
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await saveIndustryProfileAction(fd);
          if ("error" in res) {
            setError(res.error);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <Field
        label="Scope of interest"
        hint="Which societal challenge areas is your organization aligned with?"
      >
        <CheckboxGroup
          name="scope_domains"
          options={SCOPE_DOMAINS as unknown as string[]}
          selected={initial.scope_domains}
        />
      </Field>

      <Field
        label="Domain / expertise"
        hint="Technology or discipline areas your organization brings."
      >
        <CheckboxGroup
          name="expertise"
          options={EXPERTISE_AREAS as unknown as string[]}
          selected={initial.expertise}
        />
      </Field>

      <Field
        label="Support capabilities"
        hint="What forms of support can you offer projects?"
      >
        <CheckboxGroup
          name="support_capabilities"
          options={SUPPORT_CAPABILITIES}
          renderLabel={(v) => SUPPORT_TYPE_LABEL[v as never] ?? v}
          selected={initial.support_capabilities}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
        <Field label="Investment interest" htmlFor="investment_interest">
          <Select
            id="investment_interest"
            name="investment_interest"
            defaultValue={initial.investment_interest}
          >
            {INVESTMENT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {INVESTMENT_INTEREST_LABEL[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Investment range (min)"
          htmlFor="investment_range_min"
          hint="Optional. In INR."
        >
          <Input
            id="investment_range_min"
            name="investment_range_min"
            type="number"
            min={0}
            defaultValue={initial.investment_range_min ?? ""}
          />
        </Field>
        <Field label="Investment range (max)" htmlFor="investment_range_max">
          <Input
            id="investment_range_max"
            name="investment_range_max"
            type="number"
            min={0}
            defaultValue={initial.investment_range_max ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Preferred locations"
        htmlFor="preferred_locations_raw"
        hint="Comma-separated. Leave empty for anywhere."
      >
        <Input
          id="preferred_locations_raw"
          defaultValue={initial.preferred_locations.join(", ")}
          onChange={(e) => {
            const list = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const form = e.target.form;
            if (!form) return;
            for (const el of Array.from(
              form.querySelectorAll('input[name="preferred_locations"]'),
            )) {
              el.remove();
            }
            for (const item of list) {
              const hidden = document.createElement("input");
              hidden.type = "hidden";
              hidden.name = "preferred_locations";
              hidden.value = item;
              form.appendChild(hidden);
            }
          }}
        />
      </Field>
      {/* Prime hidden inputs so initial values submit even without editing */}
      {initial.preferred_locations.map((loc) => (
        <input
          key={loc}
          type="hidden"
          name="preferred_locations"
          defaultValue={loc}
        />
      ))}

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={initial.notes ?? ""} />
      </Field>

      {error && (
        <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>
      )}
      {saved && (
        <p className="mb-4 text-sm text-[color:var(--success)]">
          Interests saved.
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save interests"}
        </Button>
      </div>
    </form>
  );
}

function CheckboxGroup({
  name,
  options,
  selected,
  renderLabel,
}: {
  name: string;
  options: string[];
  selected: string[];
  renderLabel?: (value: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {options.map((v) => {
        const checked = selected.includes(v);
        return (
          <label
            key={v}
            className="flex items-center gap-2 border border-border bg-background px-3 h-10 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              name={name}
              value={v}
              defaultChecked={checked}
              className="accent-[color:var(--accent)]"
            />
            <span>{renderLabel ? renderLabel(v) : v}</span>
          </label>
        );
      })}
    </div>
  );
}

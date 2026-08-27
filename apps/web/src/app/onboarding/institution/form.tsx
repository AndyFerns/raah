"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { INSTITUTION_TYPE_LABEL, type InstitutionType, type WebsiteAnalysis } from "@/lib/supabase/types";
import { analyzeInstitutionWebsiteAction, registerInstitutionAction } from "./actions";

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
  const [analyzing, startAnalyze] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [consentAsked, setConsentAsked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function runAnalyze() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const raw = String(fd.get("website") ?? "").trim();
    if (!raw) {
      setError("Enter the official website first.");
      return;
    }
    // The server also normalizes; keep this in sync so the button state
    // reflects the URL that will actually be analyzed.
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setError(null);
    startAnalyze(async () => {
      const res = await analyzeInstitutionWebsiteAction(url, true);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAnalysis(res.analysis);
    });
  }

  function applyDetected(field: "name" | "description", value: string) {
    if (!formRef.current) return;
    const el = formRef.current.elements.namedItem(field);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = value;
    }
  }

  return (
    <form
      ref={formRef}
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
          <Input id="official_email" name="official_email" type="email" required />
        </Field>
        <Field
          label="Official website"
          htmlFor="website"
          hint="Required. Used to derive the official domain and to verify identity."
        >
          <Input id="website" name="website" placeholder="https://" required />
        </Field>
        <Field label="State" htmlFor="state">
          <Input id="state" name="state" defaultValue="Jharkhand" required />
        </Field>
        <Field label="District" htmlFor="district">
          <Input id="district" name="district" required />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" required />
        </Field>
      </div>
      <Field label="Address" htmlFor="address">
        <Textarea id="address" name="address" />
      </Field>
      <Field
        label="Short description"
        htmlFor="description"
        hint="At least 30 characters. Describe the institution and its focus."
      >
        <Textarea id="description" name="description" required minLength={30} />
      </Field>

      <div className="mb-6 border border-border bg-[color:var(--surface)] p-4">
        <p className="text-sm font-medium">Website analysis (optional)</p>
        {!consentAsked && !analysis && (
          <>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Raah can analyze publicly available information from your official
              institutional website to help complete your profile. Only publicly
              accessible content is used. Detected values never overwrite what
              you have entered — you decide what to accept.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => setConsentAsked(true)}
            >
              Allow website analysis
            </Button>
          </>
        )}
        {consentAsked && !analysis && (
          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={runAnalyze}
              disabled={analyzing}
            >
              {analyzing ? "Analyzing…" : "Analyze website"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setConsentAsked(false)}
            >
              Cancel
            </button>
          </div>
        )}
        {analysis && (
          <WebsiteAnalysisPanel
            analysis={analysis}
            onApply={applyDetected}
            onRetry={() => {
              setAnalysis(null);
              setConsentAsked(true);
            }}
          />
        )}
      </div>

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

function WebsiteAnalysisPanel({
  analysis,
  onApply,
  onRetry,
}: {
  analysis: WebsiteAnalysis;
  onApply: (field: "name" | "description", value: string) => void;
  onRetry: () => void;
}) {
  if (!analysis.ok) {
    return (
      <div className="mt-3">
        <p className="text-sm text-[color:var(--warning)]">
          {analysis.notes ?? "Website could not be analyzed."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-xs underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }
  const d = analysis.detected;
  const anything =
    d.title || d.description || d.address_hint || (d.departments && d.departments.length);
  if (!anything) {
    return (
      <p className="mt-3 text-sm text-muted">
        Nothing extractable from the homepage. You can still submit your entered
        details.
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p className="text-xs text-muted">
        Source: <span className="font-mono">{analysis.source_url}</span>
      </p>
      {d.title && (
        <DetectedRow
          label="Detected name"
          value={d.title}
          onApply={() => onApply("name", d.title as string)}
        />
      )}
      {d.description && (
        <DetectedRow
          label="Detected description"
          value={d.description}
          onApply={() => onApply("description", d.description as string)}
        />
      )}
      {d.address_hint && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            Address hint
          </p>
          <p className="mt-1">{d.address_hint}</p>
        </div>
      )}
      {d.departments && d.departments.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            Departments mentioned
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {d.departments.map((dep) => (
              <li
                key={dep}
                className="border border-border bg-background px-2 py-0.5 text-xs"
              >
                {dep}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">
            Add these under the Profile page after registration.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="text-xs underline underline-offset-4"
      >
        Re-run analysis
      </button>
    </div>
  );
}

function DetectedRow({
  label,
  value,
  onApply,
}: {
  label: string;
  value: string;
  onApply: () => void;
}) {
  const [used, setUsed] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-1 break-words">{value}</p>
      </div>
      {used ? (
        <span className="text-xs text-[color:var(--success)] shrink-0">Applied</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            onApply();
            setUsed(true);
          }}
          className="text-xs underline underline-offset-4 shrink-0"
        >
          Use detected value
        </button>
      )}
    </div>
  );
}

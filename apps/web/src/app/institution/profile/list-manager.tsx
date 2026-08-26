"use client";

import { useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { addListItemAction, removeListItemAction } from "./actions";

type Item = { id: string; label: string; sub?: string };
type Kind = "departments" | "research_areas" | "capabilities" | "facilities";

const FACILITY_TYPES = [
  { value: "facility", label: "Facility" },
  { value: "laboratory", label: "Laboratory" },
  { value: "research_centre", label: "Research Centre" },
  { value: "incubation_centre", label: "Incubation Centre" },
  { value: "innovation_centre", label: "Innovation Centre" },
];

export function ListManager({
  kind,
  institutionId,
  items,
  placeholder,
}: {
  kind: Kind;
  institutionId: string;
  items: Item[];
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [sub, setSub] = useState("");
  const [facilityType, setFacilityType] = useState("facility");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {items.length === 0 && (
          <li className="py-3 text-sm text-muted">No entries yet.</li>
        )}
        {items.map((it) => (
          <li key={it.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm">{it.label}</p>
              {it.sub && <p className="text-xs text-muted">{it.sub}</p>}
            </div>
            <button
              type="button"
              className="text-xs text-muted hover:text-[color:var(--danger)]"
              onClick={() =>
                start(async () => {
                  const res = await removeListItemAction(institutionId, kind, it.id);
                  if ("error" in res) setError(res.error);
                })
              }
              disabled={pending}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col md:flex-row gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
        {kind === "facilities" && (
          <>
            <Select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
            >
              {FACILITY_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
            <Input
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              placeholder="Short description (optional)"
            />
          </>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await addListItemAction(
                institutionId,
                kind,
                value,
                sub || undefined,
                kind === "facilities" ? facilityType : undefined
              );
              if ("error" in res) setError(res.error);
              else {
                setValue("");
                setSub("");
                setFacilityType("facility");
              }
            })
          }
        >
          Add
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}

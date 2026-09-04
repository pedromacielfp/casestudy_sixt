"use client";

import { ALL_TIME, isAllTime, Segment, SEGMENT_LABEL, YearSel } from "@/lib/crm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEGMENTS: Segment[] = ["all", "B2C", "B2P"];

interface ControlsProps {
  segment: Segment;
  onSegment: (s: Segment) => void;
  year: YearSel;
  onYear: (y: YearSel) => void;
  years: number[];
}

export function Controls({
  segment,
  onSegment,
  year,
  onYear,
  years,
}: ControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <Field label="Segment">
        <Tabs value={segment} onValueChange={(v) => onSegment(v as Segment)}>
          <TabsList>
            {SEGMENTS.map((s) => (
              <TabsTrigger key={s} value={s} className="px-3">
                {SEGMENT_LABEL[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Field>

      <Field label="Period">
        <Tabs
          value={isAllTime(year) ? ALL_TIME : String(year)}
          onValueChange={(v) => onYear(v === ALL_TIME ? ALL_TIME : Number(v))}
        >
          <TabsList>
            {years.map((y) => (
              <TabsTrigger key={y} value={String(y)} className="px-4">
                {y}
              </TabsTrigger>
            ))}
            <TabsTrigger value={ALL_TIME} className="px-4">
              All Time
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateBar, SectionHeading } from "@/components/dashboard/primitives";
import { formatInt, formatUsd } from "@/lib/format";
import { GroupRate } from "@/lib/kpis";

export function GroupRateView({
  title,
  description,
  rows,
  showLtv = false,
}: {
  title: string;
  description: string;
  rows: GroupRate[];
  showLtv?: boolean;
}) {
  const maxRate = Math.max(0.1, ...rows.map((r) => r.repeatConversionRate)) * 1.15;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <SectionHeading description={description} />
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <RateBar
              key={r.key}
              label={r.key}
              rate={r.repeatConversionRate}
              max={maxRate}
              sub={
                showLtv
                  ? `${formatInt(r.population)} customers · avg LTV ${formatUsd(r.avgLtv)}`
                  : `${formatInt(r.population)} customers`
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

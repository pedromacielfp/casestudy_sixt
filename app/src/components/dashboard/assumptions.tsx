"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meta } from "@/lib/crm";
import { formatInt, formatPct } from "@/lib/format";

function renderValue(value: string | number): string {
  if (typeof value === "number") {
    return value > 0 && value <= 1 ? formatPct(value) : formatInt(value);
  }
  return value;
}

const DEFINITION_ORDER = [
  ["gross_volume", "Gross Volume"],
  ["core_repeat_conversion_rate", "Core Repeat Conversion Rate"],
  ["first_time_vs_repeat", "First-Time vs Repeat"],
  ["population", "Population"],
  ["mom", "Month over Month"],
  ["yoy", "Year over Year"],
  ["ltv_tier", "LTV tier"],
  ["engagement", "Engagement"],
] as const;

const ASSUMPTION_ORDER = [
  ["lifetime_one_time_rate", "Lifetime one-time rate"],
  ["channel_split", "Channel split"],
  ["b2p_one_time_rate", "B2P one-time rate"],
  ["b2c_one_time_rate", "B2C one-time rate"],
  ["one_timer_channel_mix", "One-timer channel mix"],
  ["repeater_types", "Repeater types"],
  ["current_period", "Current period (2026 is year-to-date)"],
  ["all_time_view", "All Time period"],
  ["quarterly_view", "Monthly / Quarterly chart"],
  ["growth", "Growth and the trend figures"],
  ["yearly_vs_lifetime_rate", "Yearly vs lifetime rate"],
  ["cohort_recency", "Reading the cohort view"],
  ["baseline_year", "Baseline year"],
  ["ltv_repeat_relationship", "LTV and repeat rate"],
  ["engagement_repeat_relationship", "Engagement and repeat rate"],
  ["gross_volume_vs_repeat_rate", "Contracts vs customers"],
] as const;

export function AssumptionsPanel({ meta }: { meta: Meta }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assumptions &amp; Definitions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 text-sm leading-relaxed">
        <p className="max-w-3xl text-muted-foreground">
          This is a prototype on generated mock CRM data ({formatInt(meta.generated_customers)}{" "}
          customers, snapshot as of {meta.as_of}). The segment toggle{" "}
          <span className="font-medium text-foreground">
            [All Rentals | B2C | B2P]
          </span>{" "}
          and the period selector{" "}
          <span className="font-medium text-foreground">
            [2024 | 2025 | 2026 | All Time]
          </span>{" "}
          recompute every view in the browser. 2024 and 2025 are complete years;
          2026 is year-to-date through August; All Time pools 2023&ndash;2026. The
          Channel Breakdown always shows both channels so the comparison stays
          readable.
        </p>

        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DEFINITION_ORDER.filter(([k]) => meta.definitions[k]).map(([k, label]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="font-medium text-foreground">{label}</dt>
              <dd className="text-muted-foreground">{meta.definitions[k]}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-border pt-4">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {ASSUMPTION_ORDER.filter(([k]) => meta.assumptions[k] !== undefined).map(
              ([k, label]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="font-medium text-foreground">{label}</dt>
                  <dd className="text-muted-foreground">
                    {renderValue(meta.assumptions[k])}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

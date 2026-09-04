"use client";

import { useEffect, useMemo, useState } from "react";

import { Controls } from "@/components/dashboard/controls";
import { Headline } from "@/components/dashboard/headline";
import { YearlyTrendView } from "@/components/dashboard/trend";
import { ChannelView } from "@/components/dashboard/channel";
import { GroupRateView } from "@/components/dashboard/group-rate";
import { CohortView } from "@/components/dashboard/cohort";
import { AssumptionsPanel } from "@/components/dashboard/assumptions";
import { ChatWidget } from "@/components/dashboard/chat";
import { asOf, Crm, loadCrm, Segment, YearSel } from "@/lib/crm";
import { MONTH_ABBR } from "@/lib/format";
import {
  channelComparison,
  cohortMatrix,
  engagementBreakdown,
  headlineKpis,
  ltvBreakdown,
  monthlySeries,
  timeToNextHistogram,
  yearlyTrend,
} from "@/lib/kpis";

export default function DashboardPage() {
  const [crm, setCrm] = useState<Crm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("all");
  const [year, setYear] = useState<YearSel>(2026);

  useEffect(() => {
    loadCrm().then(setCrm).catch((e) => setError(String(e)));
  }, []);

  const view = useMemo(() => {
    if (!crm) return null;
    const c = crm.customers;
    const snapshot = asOf(crm.meta);
    return {
      snapshot,
      headline: headlineKpis(c, segment, year, snapshot),
      monthly: monthlySeries(c, segment, year, MONTH_ABBR, snapshot),
      trend: yearlyTrend(c, segment, crm.meta.available_years, snapshot),
      channels: channelComparison(c, year),
      engagement: engagementBreakdown(c, segment, year),
      ltv: ltvBreakdown(c, segment, year),
      cohort: cohortMatrix(c, segment, year, MONTH_ABBR, snapshot),
      histogram: timeToNextHistogram(c, segment),
    };
  }, [crm, segment, year]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-10">
        <h1 className="text-lg font-semibold">Could not load dashboard data</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  if (!crm || !view) {
    return (
      <main className="mx-auto max-w-6xl p-10 text-sm text-muted-foreground">
        Loading CRM data&hellip;
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold uppercase tracking-[0.06em]">
            <span className="text-[var(--brand)]">Sixt</span> CRM Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            One-time to repeat customer conversion &mdash; US leisure rentals
          </p>
        </header>

        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-[var(--background)]/80 px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
          <Controls
            segment={segment}
            onSegment={setSegment}
            year={year}
            onYear={setYear}
            years={crm.meta.available_years}
          />
        </div>

        <Headline
          kpis={view.headline}
          monthly={view.monthly}
          segment={segment}
          year={year}
        />

        <YearlyTrendView
          trend={view.trend}
          segment={segment}
          lifetimeRate={view.headline.lifetimeRepeatRate}
          selectedYear={year}
        />

        <ChannelView rows={view.channels} year={year} activeSegment={segment} />

        <div className="grid gap-6 lg:grid-cols-2">
          <GroupRateView
            title="Marketing Engagement"
            description="Repeat Conversion Rate for customers who engaged with a post-rental retention campaign (Email, Push, or SMS) versus those who did not. Engaged customers were planted with a higher repeat rate."
            rows={view.engagement}
          />
          <GroupRateView
            title="Customer Segments by Lifetime Value"
            description="Repeat Conversion Rate by LTV tercile (High / Medium / Low total spend). LTV carries a per-customer price level, not just a rental count, so the High tier leads without being a repeater proxy."
            rows={view.ltv}
            showLtv
          />
        </div>

        <CohortView rows={view.cohort} histogram={view.histogram} year={year} />

        <AssumptionsPanel meta={crm.meta} />

        <footer className="pb-6 pt-2 text-xs text-muted-foreground">
          Prototype on generated mock data. Not real Sixt figures.
        </footer>
      </main>

      <ChatWidget />
    </>
  );
}

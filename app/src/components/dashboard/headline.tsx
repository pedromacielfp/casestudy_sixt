"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { Delta, SplitBar, Stat } from "@/components/dashboard/primitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AXIS_TICK, COLORS } from "@/lib/palette";
import { formatInt, formatPct, MONTH_ABBR } from "@/lib/format";
import { HeadlineKpis, MonthlyPoint, toQuarterly } from "@/lib/kpis";
import { Segment, SEGMENT_LABEL, YearSel, yearLabel } from "@/lib/crm";

export function Headline({
  kpis,
  monthly,
  segment,
  year,
}: {
  kpis: HeadlineKpis;
  monthly: MonthlyPoint[];
  segment: Segment;
  year: YearSel;
}) {
  const [granularity, setGranularity] = useState<"month" | "quarter">("month");
  const series = useMemo(
    () => (granularity === "quarter" ? toQuarterly(monthly) : monthly),
    [granularity, monthly],
  );
  const periodLabel = yearLabel(year);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Headline KPIs
          <span className="ml-2 font-normal text-muted-foreground">
            {SEGMENT_LABEL[segment]} &middot; {periodLabel}
            {kpis.isPartial &&
              ` · year-to-date through ${MONTH_ABBR[kpis.monthsOfData - 1]}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <Stat
            label="Total Conversions (Gross Volume)"
            value={formatInt(kpis.grossVolume)}
            sub={
              kpis.isAllTime
                ? "Closed rental contracts, all years (2023–2026)"
                : kpis.isPartial
                  ? `Closed rental contracts, Jan–${MONTH_ABBR[kpis.monthsOfData - 1]} ${year}`
                  : `Closed rental contracts starting in ${year}`
            }
          />
          <Stat
            label="Core Repeat Conversion Rate"
            value={formatPct(kpis.repeatConversionRate, 1)}
            sub={
              kpis.isAllTime
                ? `${formatInt(kpis.oneTimeInPopulation)} of ${formatInt(
                    kpis.population,
                  )} customers rented once and never returned — this IS the ${formatPct(
                    kpis.lifetimeRepeatRate,
                  )} lifetime rate (every customer counted once). Single years read higher because repeat customers recur across years.`
                : `${formatInt(kpis.oneTimeInPopulation)} of ${formatInt(
                    kpis.population,
                  )} customers rented once and did not return · ${formatPct(
                    kpis.lifetimeRepeatRate,
                  )} lifetime baseline`
            }
            accent
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SplitBar
            label={
              kpis.isAllTime
                ? "Customers — one-time vs repeat"
                : "Customers this year — one-time vs repeat"
            }
            leftLabel="One-time"
            leftValue={kpis.oneTimeInPopulation}
            rightLabel="Repeat"
            rightValue={kpis.lifetimeRepeaters}
            caption={`Unique people. One-time = rented once and never came back. This is the ${formatPct(
              1 - kpis.repeatConversionRate,
            )} the business is trying to convert${
              kpis.isAllTime
                ? "."
                : `; the lifetime baseline is ${formatPct(1 - kpis.lifetimeRepeatRate)}.`
            }`}
          />
          <SplitBar
            label={
              kpis.isAllTime
                ? "Contracts — 1st Rent vs 2+ Rents (Gross Volume)"
                : "Contracts this year — 1st Rent vs 2+ Rents (Gross Volume)"
            }
            leftLabel="1st Rent"
            leftValue={kpis.firstRentVolume}
            rightLabel="2+ Rents"
            rightValue={kpis.repeatRentVolume}
            caption="Rental contracts, split by sequence. A repeat customer books one 1st Rent plus several 2+ Rents, so this split is less lopsided than the customer split."
          />
        </div>

        {!kpis.isAllTime && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Year over Year{" "}
                {kpis.isPartial && (
                  <span className="normal-case">(vs the same months last year)</span>
                )}
              </span>
              <div className="grid grid-cols-2 gap-x-8">
                <Delta label="1st Rent volume" value={kpis.yoyFirst} size="lg" />
                <Delta label="2+ Rents volume" value={kpis.yoyRepeat} size="lg" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {MONTH_ABBR[kpis.latestMonth - 1]} vs {MONTH_ABBR[kpis.latestMonth - 2]}
              </span>
              <div className="grid grid-cols-2 gap-x-8">
                <Delta label="1st Rent volume" value={kpis.momFirst} />
                <Delta label="2+ Rents volume" value={kpis.momRepeat} />
              </div>
              <span className="text-xs text-muted-foreground">
                Month-to-month, seasonal: repeat volume peaks in early autumn as
                summer renters return, then eases toward the holidays.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpis.isAllTime
                ? "Contracts by calendar month — summed across 2023–2026"
                : "Contracts — 1st Rent vs 2+ Rents"}
            </span>
            <Tabs
              value={granularity}
              onValueChange={(v) => setGranularity(v as "month" | "quarter")}
            >
              <TabsList>
                <TabsTrigger value="month" className="px-3">
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="quarter" className="px-3">
                  Quarterly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={52} tickFormatter={(v) => formatInt(Number(v))} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={<ChartTooltip formatValue={(v) => formatInt(Number(v))} />}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  iconType="square"
                  wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                />
                <Bar isAnimationActive={false} dataKey="first" stackId="v" name="1st Rent" fill={COLORS.ink} maxBarSize={granularity === "quarter" ? 56 : 34} />
                <Bar isAnimationActive={false} dataKey="repeat" stackId="v" name="2+ Rents" fill={COLORS.brand} maxBarSize={granularity === "quarter" ? 56 : 34} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {granularity === "quarter" && kpis.isPartial && (
            <span className="text-xs text-muted-foreground">
              Q{Math.ceil(kpis.monthsOfData / 3)} {year} covers{" "}
              {MONTH_ABBR[Math.floor((kpis.monthsOfData - 1) / 3) * 3]}–
              {MONTH_ABBR[kpis.monthsOfData - 1]} only.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

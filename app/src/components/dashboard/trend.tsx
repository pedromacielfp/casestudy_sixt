"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { SectionHeading } from "@/components/dashboard/primitives";
import { AXIS_TICK, COLORS } from "@/lib/palette";
import { formatInt, formatPct } from "@/lib/format";
import { TrendPoint } from "@/lib/kpis";
import { isAllTime, Segment, SEGMENT_LABEL, YearSel } from "@/lib/crm";

export function YearlyTrendView({
  trend,
  segment,
  lifetimeRate,
  selectedYear,
}: {
  trend: TrendPoint[];
  segment: Segment;
  lifetimeRate: number;
  selectedYear: YearSel;
}) {
  const volumeData = trend.map((t) => ({
    label: t.label,
    year: t.year,
    first: t.firstRentVolume,
    repeat: t.repeatRentVolume,
  }));
  const rateData = trend.map((t) => ({
    label: t.label,
    year: t.year,
    rate: t.repeatConversionRate,
  }));

  const rateMax = Math.ceil(
    (Math.max(lifetimeRate, ...rateData.map((d) => d.rate)) * 1.15) / 0.1,
  ) * 0.1;
  const rateTicks = Array.from({ length: Math.round(rateMax / 0.1) + 1 }, (_, i) => i * 0.1);

  const isSelected = (y: number) => !isAllTime(selectedYear) && selectedYear === y;
  const dim = (y: number) =>
    isAllTime(selectedYear) || isSelected(y) ? 1 : 0.4;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Years at a Glance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SectionHeading
          description={`${SEGMENT_LABEL[segment]}, every selectable year side by side (not summed). The selected period is highlighted; 2026 is year-to-date. The dashed line on the right is the ${formatPct(
            lifetimeRate,
          )} lifetime repeat rate — single years sit above it because repeat customers rent in more than one year.`}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Gross Volume &mdash; 1st Rent vs 2+ Rents
            </span>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={48} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={<ChartTooltip formatValue={(v) => formatInt(Number(v))} />}
                  />
                  <Legend verticalAlign="top" align="right" height={28} iconType="square" wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                  <Bar isAnimationActive={false} dataKey="first" stackId="v" name="1st Rent" fill={COLORS.ink} maxBarSize={56}>
                    {volumeData.map((d) => (
                      <Cell key={d.year} fillOpacity={dim(d.year)} />
                    ))}
                  </Bar>
                  <Bar isAnimationActive={false} dataKey="repeat" stackId="v" name="2+ Rents" fill={COLORS.brand} maxBarSize={56} radius={[2, 2, 0, 0]}>
                    {volumeData.map((d) => (
                      <Cell key={d.year} fillOpacity={dim(d.year)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Core Repeat Conversion Rate
            </span>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rateData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS_TICK}
                    width={44}
                    domain={[0, rateMax]}
                    ticks={rateTicks}
                    tickFormatter={(v) => formatPct(Number(v))}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={<ChartTooltip formatValue={(v) => formatPct(Number(v), 1)} />}
                  />
                  <ReferenceLine
                    y={lifetimeRate}
                    stroke={COLORS.mutedInk}
                    strokeDasharray="4 4"
                    label={{
                      value: `lifetime ${formatPct(lifetimeRate)}`,
                      position: "insideBottomRight",
                      fontSize: 10,
                      fill: COLORS.mutedInk,
                    }}
                  />
                  <Bar isAnimationActive={false} dataKey="rate" name="Repeat rate" fill={COLORS.brand} maxBarSize={56} radius={[2, 2, 0, 0]}>
                    {rateData.map((d) => (
                      <Cell key={d.year} fillOpacity={dim(d.year)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

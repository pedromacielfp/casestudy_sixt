"use client";

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
import { RateBar, SectionHeading } from "@/components/dashboard/primitives";
import { AXIS_TICK, COLORS } from "@/lib/palette";
import { formatInt } from "@/lib/format";
import { ChannelRow } from "@/lib/kpis";
import { isAllTime, YearSel } from "@/lib/crm";

const LABEL: Record<string, string> = {
  B2C: "B2C (Direct)",
  B2P: "B2P (Partners)",
};

export function ChannelView({
  rows,
  year,
  activeSegment,
}: {
  rows: ChannelRow[];
  year: YearSel;
  activeSegment: string;
}) {
  const b2c = rows.find((r) => r.channel === "B2C")!;
  const b2p = rows.find((r) => r.channel === "B2P")!;
  const volumeLeader = b2c.grossVolume >= b2p.grossVolume ? "B2C" : "B2P";

  const chartData = rows.map((r) => ({
    channel: LABEL[r.channel],
    first: r.firstRentVolume,
    repeat: r.repeatRentVolume,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Breakdown &mdash; B2C vs B2P</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SectionHeading
          description={`Both channels ${
            isAllTime(year) ? "across all years" : `for ${year}`
          }, independent of the segment toggle. Partner (B2P) demand is acquisition-heavy and churns faster; direct (B2C) customers repeat more, so ${volumeLeader} can still lead on Gross Volume.`}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Repeat Conversion Rate
            </span>
            <RateBar
              label="B2C (Direct)"
              rate={b2c.repeatConversionRate}
              sub={`${formatInt(b2c.population)} customers`}
              emphasis={activeSegment === "B2C"}
            />
            <RateBar
              label="B2P (Partners)"
              rate={b2p.repeatConversionRate}
              sub={`${formatInt(b2p.population)} customers`}
              emphasis={activeSegment === "B2P"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Gross Volume &mdash; 1st Rent vs 2+ Rents
            </span>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="channel" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={48} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={<ChartTooltip formatValue={(v) => formatInt(Number(v))} />}
                  />
                  <Legend verticalAlign="top" align="right" height={28} iconType="square" wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                  <Bar isAnimationActive={false} dataKey="first" stackId="v" name="1st Rent" fill={COLORS.ink} maxBarSize={64} />
                  <Bar isAnimationActive={false} dataKey="repeat" stackId="v" name="2+ Rents" fill={COLORS.brand} maxBarSize={64} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

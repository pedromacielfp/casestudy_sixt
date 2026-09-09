"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
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
import { CohortRow, COHORT_HORIZONS, HistogramBin } from "@/lib/kpis";
import { isAllTime, YearSel } from "@/lib/crm";

function cellStyle(value: number, size: number): React.CSSProperties {
  if (size === 0) return { color: "rgba(244,239,233,0.3)" };
  const alpha = Math.min(0.92, value / 0.35);
  return {
    backgroundColor: `rgba(255, 95, 0, ${alpha})`,
    color: value > 0.22 ? "#1a0f07" : "rgba(244,239,233,0.82)",
  };
}

export function CohortView({
  rows,
  histogram,
  year,
}: {
  rows: CohortRow[];
  histogram: HistogramBin[];
  year: YearSel;
}) {
  const allTime = isAllTime(year);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort &amp; Frequency</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <SectionHeading
            description={
              allTime
                ? `Rows are the calendar month of each customer's first-ever rental, pooled across every year (2023–2026), so each month carries a full retention curve. A cell is the share of that cohort with a repeat rental in that elapsed-time window; "Rebooked" is the share that returned at all. October-onward cohorts (dimmed) are acquired off-peak and rebook little.`
                : `Rows are the month of a customer's first-ever rental in ${year}. A cell is the share of that cohort with a repeat rental in that elapsed-time window; "Rebooked" is the share that returned at all. Read the early-month rows for the conversion signal: October-onward cohorts (dimmed) are acquired off-peak and rebook little, and the most recent cohorts have not had time to return.`
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">First rental</th>
                  <th className="px-2 py-1 text-right font-medium">Cohort</th>
                  {COHORT_HORIZONS.map((h) => (
                    <th key={h} className="px-2 py-1 text-center font-medium">
                      {h}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-medium">Rebooked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month} className={row.note ? "opacity-45" : undefined}>
                    <td className="px-2 py-1 font-medium">
                      {row.month}
                      {!allTime && ` ${year}`}
                      {row.note === "recent" && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          too recent
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {row.size ? formatInt(row.size) : "—"}
                    </td>
                    {row.window.map((v, i) => (
                      <td
                        key={i}
                        className="rounded px-2 py-1 text-center tabular-nums"
                        style={cellStyle(v, row.size)}
                      >
                        {row.size ? formatPct(v) : "—"}
                      </td>
                    ))}
                    <td className="rounded px-2 py-1 text-center font-semibold tabular-nums text-[var(--brand)]">
                      {row.size ? formatPct(row.total) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SectionHeading
            description="Time between one rental and the customer's next one. Two clusters: frequent repeaters at 60-90 days, seasonal (annual-trip) repeaters at 330-365 days."
          />
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <ReferenceArea x1="60" x2="90" fill="rgba(255,255,255,0.06)" />
                <ReferenceArea x1="330" x2="360" fill="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  interval={3}
                  label={{ value: "days to next rental", position: "insideBottom", offset: -2, fontSize: 11, fill: COLORS.mutedInk }}
                />
                <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={44} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  content={
                    <ChartTooltip formatValue={(v) => `${formatInt(Number(v))} gaps`} />
                  }
                />
                <Bar isAnimationActive={false} dataKey="count" name="Rental pairs" fill={COLORS.brand} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

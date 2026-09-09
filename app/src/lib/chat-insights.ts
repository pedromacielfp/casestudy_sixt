import { ALL_TIME, Customer, daysBetween, Segment, SEGMENT_LABEL } from "./crm";
import { channelComparison, engagementBreakdown, ltvBreakdown } from "./kpis";
import { formatInt, formatPct, formatUsd } from "./format";

/**
 * Derived, still-aggregated patterns the assistant can ground recommendations in:
 * the channel gap, campaign lift and reach, the LTV relationship, rebooking timing
 * and the repeater mix. Computed from the customer array server-side; only these
 * roll-ups are ever put in front of the model, never the customer rows.
 */

function quantile(sorted: number[], f: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(f * (sorted.length - 1))];
}

function gapPts(a: number, b: number): string {
  const d = (a - b) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}pt`;
}

function rebookGaps(customers: Customer[], segment: Segment): number[] {
  const gaps: number[] = [];
  for (const c of customers) {
    if (segment !== "all" && c.channel !== segment) continue;
    if (c.rentals.length < 2) continue;
    gaps.push(daysBetween(c.rentals[0].start, c.rentals[1].start));
  }
  return gaps.sort((x, y) => x - y);
}

function repeaterMix(customers: Customer[], segment: Segment) {
  let frequent = 0;
  let seasonal = 0;
  for (const c of customers) {
    if (segment !== "all" && c.channel !== segment) continue;
    if (c.repeater_type === "frequent") frequent += 1;
    else if (c.repeater_type === "seasonal") seasonal += 1;
  }
  return { frequent, seasonal };
}

export function buildInsightsBlock(customers: Customer[]): string {
  const lines: string[] = [];

  // Channel gap -- the headline strategic pattern.
  const channels = channelComparison(customers, ALL_TIME);
  const b2c = channels.find((r) => r.channel === "B2C")!;
  const b2p = channels.find((r) => r.channel === "B2P")!;
  const base = b2c.population + b2p.population;
  const b2pOneTimers = Math.round(b2p.population * (1 - b2p.repeatConversionRate));
  lines.push(
    `Channel gap (All Time): B2C repeats at ${formatPct(b2c.repeatConversionRate, 1)}, ` +
      `B2P at ${formatPct(b2p.repeatConversionRate, 1)} (${gapPts(b2c.repeatConversionRate, b2p.repeatConversionRate)} gap). ` +
      `Per the brief the lifetime one-timers split 50/50 by channel - B2P and B2C each hold about ${formatInt(b2pOneTimers)} - ` +
      `but B2P's one-time rate is far higher (${formatPct(1 - b2p.repeatConversionRate, 0)} vs ${formatPct(1 - b2c.repeatConversionRate, 0)}). ` +
      `Same intake, worse retention: B2P is ${formatInt(b2p.population)} of ${formatInt(base)} customers (${formatPct(b2p.population / base)}) and the structural drag on the blended rate.`,
  );

  // Campaign engagement lift and reach, per segment.
  for (const seg of ["all", "B2C", "B2P"] as Segment[]) {
    const [engaged, notEngaged] = engagementBreakdown(customers, seg, ALL_TIME);
    const total = engaged.population + notEngaged.population;
    lines.push(
      `Engagement lift (${SEGMENT_LABEL[seg]}, All Time): engaged repeat at ${formatPct(engaged.repeatConversionRate, 1)} ` +
        `vs ${formatPct(notEngaged.repeatConversionRate, 1)} non-engaged ` +
        `(${gapPts(engaged.repeatConversionRate, notEngaged.repeatConversionRate)} lift). ` +
        `Campaign reach is ${formatPct(engaged.population / total)} of the base ` +
        `(${formatInt(engaged.population)} of ${formatInt(total)}).`,
    );
  }

  // LTV terciles: repeat rate climbs steeply with spend level.
  const ltv = ltvBreakdown(customers, "all", ALL_TIME);
  lines.push(
    "LTV terciles (All Rentals, All Time): " +
      ltv
        .map(
          (t) =>
            `${t.key} repeat ${formatPct(t.repeatConversionRate, 1)}, avg LTV ${formatUsd(t.avgLtv)}, n ${formatInt(t.population)}`,
        )
        .join("; ") +
      ".",
  );

  // Rebooking timing -- when a win-back trigger should fire.
  const gaps = rebookGaps(customers, "all");
  lines.push(
    `Rebooking timing (All Rentals): of the ${formatInt(gaps.length)} customers who took a 2nd rental, ` +
      `the 1st-to-2nd gap was ${quantile(gaps, 0.25)} / ${quantile(gaps, 0.5)} / ${quantile(gaps, 0.75)} days ` +
      `(p25 / median / p75). The repeat window is roughly 2-3 months after the first rental.`,
  );

  // Repeater mix -- who retention programs actually act on.
  const mix = repeaterMix(customers, "all");
  const repeaters = mix.frequent + mix.seasonal;
  lines.push(
    `Repeater mix (All Rentals): of ${formatInt(repeaters)} lifetime repeaters, ` +
      `${formatInt(mix.frequent)} are frequent (rebook 60-90 days out) and ${formatInt(mix.seasonal)} are seasonal ` +
      `(one trip about a year later). Frequent repeaters are the group win-back timing applies to.`,
  );

  return lines.join("\n");
}

import {
  Channel,
  Customer,
  daysBetween,
  inSegment,
  isAllTime,
  LtvTier,
  month,
  monthsInYear,
  Segment,
  year as yearOf,
  YearSel,
} from "./crm";

const DAYS_PER_MONTH = 30.44;

export type Snapshot = { year: number; month: number };

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

interface YearVolume {
  first: number;
  repeat: number;
  monthly: { first: number; repeat: number }[]; // index 0 = January
}

function yearVolume(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
  maxMonth = 12,
): YearVolume {
  const monthly = Array.from({ length: 12 }, () => ({ first: 0, repeat: 0 }));
  let first = 0;
  let repeat = 0;
  const allTime = isAllTime(y);
  for (const c of customers) {
    if (!inSegment(c, segment)) continue;
    for (const r of c.rentals) {
      if ((!allTime && yearOf(r.start) !== y) || month(r.start) > maxMonth) continue;
      const bucket = r.seq === 1 ? "first" : "repeat";
      monthly[month(r.start) - 1][bucket] += 1;
      if (r.seq === 1) first += 1;
      else repeat += 1;
    }
  }
  return { first, repeat, monthly };
}

function lifetimeRepeatRate(customers: Customer[], segment: Segment): number {
  let total = 0;
  let repeaters = 0;
  for (const c of customers) {
    if (!inSegment(c, segment)) continue;
    total += 1;
    if (c.lifetime_repeater) repeaters += 1;
  }
  return total ? repeaters / total : 0;
}

function populationRate(customers: Customer[], segment: Segment, y: YearSel) {
  const allTime = isAllTime(y);
  let population = 0;
  let repeaters = 0;
  for (const c of customers) {
    if (!inSegment(c, segment)) continue;
    if (
      c.rentals.length > 0 &&
      (allTime || c.rentals.some((r) => yearOf(r.start) === y))
    ) {
      population += 1;
      if (c.lifetime_repeater) repeaters += 1;
    }
  }
  return { population, repeaters, rate: population ? repeaters / population : 0 };
}

export interface HeadlineKpis {
  grossVolume: number;
  firstRentVolume: number;
  repeatRentVolume: number;
  population: number;
  lifetimeRepeaters: number;
  oneTimeInPopulation: number;
  repeatConversionRate: number;
  lifetimeRepeatRate: number;
  momFirst: number | null;
  momRepeat: number | null;
  yoyFirst: number | null;
  yoyRepeat: number | null;
  latestMonth: number; // 1-12
  monthsOfData: number; // 12 for a complete year, fewer for the current year
  isPartial: boolean;
  isAllTime: boolean;
}

export function headlineKpis(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
  snapshot: Snapshot,
): HeadlineKpis {
  const allTime = isAllTime(y);
  const months = allTime ? 12 : monthsInYear(y, snapshot);
  const vol = yearVolume(customers, segment, y);
  // Year-over-year needs a prior calendar year; it does not apply to All Time.
  const prev = allTime
    ? { first: 0, repeat: 0, monthly: [] as YearVolume["monthly"] }
    : yearVolume(customers, segment, (y as number) - 1, months);
  const { population, repeaters, rate } = populationRate(customers, segment, y);

  let latestIdx = months - 1;
  for (let i = months - 1; i >= 0; i--) {
    if (vol.monthly[i].first + vol.monthly[i].repeat > 0) {
      latestIdx = i;
      break;
    }
  }
  const cur = vol.monthly[latestIdx];
  const before = latestIdx > 0 ? vol.monthly[latestIdx - 1] : { first: 0, repeat: 0 };

  return {
    grossVolume: vol.first + vol.repeat,
    firstRentVolume: vol.first,
    repeatRentVolume: vol.repeat,
    population,
    lifetimeRepeaters: repeaters,
    oneTimeInPopulation: population - repeaters,
    repeatConversionRate: rate,
    lifetimeRepeatRate: lifetimeRepeatRate(customers, segment),
    momFirst: allTime ? null : pctChange(cur.first, before.first),
    momRepeat: allTime ? null : pctChange(cur.repeat, before.repeat),
    yoyFirst: allTime ? null : pctChange(vol.first, prev.first),
    yoyRepeat: allTime ? null : pctChange(vol.repeat, prev.repeat),
    latestMonth: latestIdx + 1,
    monthsOfData: months,
    isPartial: !allTime && months < 12,
    isAllTime: allTime,
  };
}

export interface MonthlyPoint {
  month: string;
  first: number;
  repeat: number;
}

export function monthlySeries(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
  monthAbbr: string[],
  snapshot: Snapshot,
): MonthlyPoint[] {
  const vol = yearVolume(customers, segment, y);
  const upTo = isAllTime(y) ? 12 : monthsInYear(y, snapshot);
  return vol.monthly
    .slice(0, upTo)
    .map((m, i) => ({ month: monthAbbr[i], first: m.first, repeat: m.repeat }));
}

/** Roll a monthly series up into quarters. Handles a partial final quarter. */
export function toQuarterly(points: MonthlyPoint[]): MonthlyPoint[] {
  const quarters: MonthlyPoint[] = [];
  for (let q = 0; q < 4; q++) {
    const slice = points.slice(q * 3, q * 3 + 3);
    if (slice.length === 0) break;
    quarters.push({
      month: `Q${q + 1}`,
      first: slice.reduce((s, m) => s + m.first, 0),
      repeat: slice.reduce((s, m) => s + m.repeat, 0),
    });
  }
  return quarters;
}

export interface ChannelRow {
  channel: Channel;
  grossVolume: number;
  firstRentVolume: number;
  repeatRentVolume: number;
  population: number;
  repeatConversionRate: number;
}

export function channelComparison(customers: Customer[], y: YearSel): ChannelRow[] {
  return (["B2C", "B2P"] as Channel[]).map((channel) => {
    const vol = yearVolume(customers, channel, y);
    const pr = populationRate(customers, channel, y);
    return {
      channel,
      grossVolume: vol.first + vol.repeat,
      firstRentVolume: vol.first,
      repeatRentVolume: vol.repeat,
      population: pr.population,
      repeatConversionRate: pr.rate,
    };
  });
}

export interface TrendPoint {
  year: number;
  label: string;
  grossVolume: number;
  firstRentVolume: number;
  repeatRentVolume: number;
  population: number;
  repeatConversionRate: number;
  isPartial: boolean;
}

/**
 * The selectable years side by side (not summed), for the "all years together"
 * view. Respects the segment toggle; 2026 is flagged year-to-date.
 */
export function yearlyTrend(
  customers: Customer[],
  segment: Segment,
  years: number[],
  snapshot: Snapshot,
): TrendPoint[] {
  return years.map((y) => {
    const vol = yearVolume(customers, segment, y);
    const { population, rate } = populationRate(customers, segment, y);
    const partial = y === snapshot.year;
    return {
      year: y,
      label: partial ? `${y} YTD` : String(y),
      grossVolume: vol.first + vol.repeat,
      firstRentVolume: vol.first,
      repeatRentVolume: vol.repeat,
      population,
      repeatConversionRate: rate,
      isPartial: partial,
    };
  });
}

export interface GroupRate {
  key: string;
  population: number;
  repeatConversionRate: number;
  avgLtv: number;
}

function populationCustomers(customers: Customer[], segment: Segment, y: YearSel): Customer[] {
  const allTime = isAllTime(y);
  return customers.filter(
    (c) =>
      inSegment(c, segment) &&
      c.rentals.length > 0 &&
      (allTime || c.rentals.some((r) => yearOf(r.start) === y)),
  );
}

function groupRate(members: Customer[], key: string): GroupRate {
  const repeaters = members.filter((c) => c.lifetime_repeater).length;
  const ltvSum = members.reduce((s, c) => s + c.ltv, 0);
  return {
    key,
    population: members.length,
    repeatConversionRate: members.length ? repeaters / members.length : 0,
    avgLtv: members.length ? ltvSum / members.length : 0,
  };
}

export function engagementBreakdown(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
): GroupRate[] {
  const pop = populationCustomers(customers, segment, y);
  return [
    groupRate(pop.filter((c) => c.engaged), "Engaged"),
    groupRate(pop.filter((c) => !c.engaged), "Not engaged"),
  ];
}

export function ltvBreakdown(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
): GroupRate[] {
  const pop = populationCustomers(customers, segment, y);
  return (["High", "Medium", "Low"] as LtvTier[]).map((tier) =>
    groupRate(pop.filter((c) => c.ltv_tier === tier), tier),
  );
}

export const COHORT_HORIZONS = ["0-3 mo", "3-6 mo", "6-12 mo", "12 mo+"] as const;
const HORIZON_BOUNDS = [3, 6, 12, Infinity];

export interface CohortRow {
  month: string;
  size: number;
  /** share of the cohort with at least one repeat rental in each elapsed-time window */
  window: number[];
  /** overall share of the cohort that has rebooked at all */
  total: number;
  /** "recent" = too little history to have rebooked; "offpeak" = low-intent Q4 acquisition */
  note: "recent" | "offpeak" | null;
}

function horizonBucket(months: number): number {
  return HORIZON_BOUNDS.findIndex((b) => months < b);
}

export function cohortMatrix(
  customers: Customer[],
  segment: Segment,
  y: YearSel,
  monthAbbr: string[],
  snapshot: Snapshot,
): CohortRow[] {
  const allTime = isAllTime(y);
  const rows: CohortRow[] = [];
  const lastMonth = allTime ? 12 : monthsInYear(y, snapshot);
  for (let m = 1; m <= lastMonth; m++) {
    const cohort = customers.filter(
      (c) =>
        inSegment(c, segment) &&
        c.rentals.length > 0 &&
        (allTime || yearOf(c.rentals[0].start) === y) &&
        month(c.rentals[0].start) === m,
    );
    const window = [0, 0, 0, 0];
    let rebooked = 0;
    for (const c of cohort) {
      if (c.rentals.length < 2) continue;
      rebooked += 1;
      const first = c.rentals[0].start;
      const seen = new Set(
        c.rentals
          .slice(1)
          .map((r) => horizonBucket(daysBetween(first, r.start) / DAYS_PER_MONTH)),
      );
      seen.forEach((b) => (window[b] += 1));
    }
    const n = cohort.length || 1;
    const recent = !allTime && y === snapshot.year && m > snapshot.month - 3;
    const offpeak = m >= 10;
    rows.push({
      month: monthAbbr[m - 1],
      size: cohort.length,
      window: window.map((w) => w / n),
      total: rebooked / n,
      note: recent ? "recent" : offpeak ? "offpeak" : null,
    });
  }
  return rows;
}

export interface HistogramBin {
  label: string;
  center: number;
  count: number;
}

export function timeToNextHistogram(
  customers: Customer[],
  segment: Segment,
  binDays = 15,
  maxDays = 405,
): HistogramBin[] {
  const bins: number[] = new Array(Math.ceil(maxDays / binDays)).fill(0);
  for (const c of customers) {
    if (!inSegment(c, segment)) continue;
    for (let i = 1; i < c.rentals.length; i++) {
      const gap = daysBetween(c.rentals[i - 1].start, c.rentals[i].start);
      const idx = Math.min(bins.length - 1, Math.floor(gap / binDays));
      if (idx >= 0) bins[idx] += 1;
    }
  }
  return bins.map((count, i) => ({
    label: `${i * binDays}`,
    center: i * binDays + binDays / 2,
    count,
  }));
}

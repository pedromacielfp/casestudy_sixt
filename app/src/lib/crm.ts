export type Channel = "B2C" | "B2P";
export type Segment = "all" | Channel;
export type LtvTier = "High" | "Medium" | "Low";
export type Engagement = "Email" | "Push" | "SMS" | "None";
export type RepeaterType = "frequent" | "seasonal" | null;

export interface Rental {
  seq: number;
  start: string; // ISO date
  end: string;
  value: number;
}

export interface Customer {
  id: string;
  channel: Channel;
  ltv: number;
  ltv_tier: LtvTier;
  engagement: Engagement;
  engaged: boolean;
  lifetime_repeater: boolean;
  repeater_type: RepeaterType;
  rentals: Rental[];
}

export interface Meta {
  as_of: string;
  available_years: number[];
  baseline_year: number;
  currency: string;
  generated_customers: number;
  definitions: Record<string, string>;
  assumptions: Record<string, string | number>;
}

export interface Crm {
  meta: Meta;
  kpis: Record<string, Record<string, Record<string, number | null>>>;
  customers: Customer[];
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  all: "All Rentals",
  "B2C": "B2C (Direct)",
  "B2P": "B2P (Partners)",
};

/** The year selector is one of the calendar years or the pooled "All Time" view. */
export const ALL_TIME = "all-time" as const;
export type YearSel = number | typeof ALL_TIME;

export function isAllTime(y: YearSel): y is typeof ALL_TIME {
  return y === ALL_TIME;
}

export function yearLabel(y: YearSel): string {
  return isAllTime(y) ? "All Time" : String(y);
}

export async function loadCrm(): Promise<Crm> {
  const res = await fetch("/data/crm.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load CRM data (${res.status})`);
  return res.json();
}

export function inSegment(customer: Customer, segment: Segment): boolean {
  return segment === "all" || customer.channel === segment;
}

export function year(dateIso: string): number {
  return Number(dateIso.slice(0, 4));
}

export function month(dateIso: string): number {
  return Number(dateIso.slice(5, 7));
}

/** Snapshot cut-off from meta.as_of, e.g. { year: 2026, month: 8 }. */
export function asOf(meta: Meta): { year: number; month: number } {
  return { year: year(meta.as_of), month: month(meta.as_of) };
}

/** Last month with data for a year: the snapshot month for the current year, else 12. */
export function monthsInYear(y: number, snapshot: { year: number; month: number }): number {
  return y === snapshot.year ? snapshot.month : 12;
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return Math.round((b - a) / 86_400_000);
}

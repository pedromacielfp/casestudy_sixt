import type { Crm } from "./crm";

type Kpis = Crm["kpis"];
type Meta = Crm["meta"];

function pct(v: number | null): string {
  return v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

/**
 * A compact text summary of the dashboard - meta definitions/assumptions plus the
 * precomputed KPI block. This is the ONLY data sent to the model; the customer
 * array is never included.
 */
export function buildSystemPrompt(meta: Meta, kpis: Kpis): string {
  const years = meta.available_years;
  const periods = [...years.map(String), "all_time"];
  const table: string[] = [];
  for (const seg of ["all", "B2C", "B2P"] as const) {
    for (const p of periods) {
      const k = kpis[seg][p];
      if (!k) continue;
      const name = seg === "all" ? "All Rentals" : seg;
      const label = p === "all_time" ? "All Time (2023-2026 pooled)" : p;
      table.push(
        `${name} ${label}: gross volume ${k.gross_volume} ` +
          `(1st rent ${k.first_rent_volume}, 2+ rents ${k.repeat_rent_volume}); ` +
          `population ${k.population}; lifetime repeaters in population ${k.lifetime_repeaters_in_population}; ` +
          `repeat conversion rate ${((k.repeat_conversion_rate as number) * 100).toFixed(1)}%; ` +
          `MoM 1st ${pct(k.mom_first_rent)} / 2+ ${pct(k.mom_repeat_rent)}; ` +
          `YoY 1st ${pct(k.yoy_first_rent)} / 2+ ${pct(k.yoy_repeat_rent)}`,
      );
    }
  }

  const defs = Object.entries(meta.definitions)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const assumptions = Object.entries(meta.assumptions)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `You are the assistant for the Sixt CRM Dashboard, a prototype that tracks one-time-to-repeat customer conversion for Sixt's US leisure rentals. The data is generated mock CRM data, not real figures.

Answer ONLY from the figures and definitions below. If a question cannot be answered from them, say so plainly. Keep answers to 1-3 sentences. When asked for a number, give the exact value from the table and name the segment and year. Do not invent data, do not give advice, and do not discuss anything outside this dataset.

Snapshot date: ${meta.as_of}. Selectable periods: ${years.join(", ")}, and All Time (2023-2026 pooled). 2024 and 2025 are complete years; 2026 is year-to-date through August. All Time has no MoM or YoY, and its repeat conversion rate equals the lifetime rate. Segments: All Rentals, B2C (Direct), B2P (Partners). The dashboard opens on All Rentals / 2026.

KPI TABLE
${table.join("\n")}

DEFINITIONS
${defs}

ASSUMPTIONS
${assumptions}`;
}

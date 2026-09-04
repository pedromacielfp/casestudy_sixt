import type { Crm } from "./crm";
import { buildInsightsBlock } from "./chat-insights";

function pct(v: number | null): string {
  return v === null ? "n/a" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

/**
 * A compact text summary of the dashboard - meta definitions/assumptions, the
 * precomputed KPI block, and a small set of derived patterns the assistant can
 * base recommendations on. This is the ONLY data sent to the model; the customer
 * array is never included, only roll-ups of it.
 */
export function buildSystemPrompt(crm: Crm): string {
  const { meta, kpis, customers } = crm;
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
  const insights = buildInsightsBlock(customers);

  return `You are the assistant for the Sixt CRM Dashboard, a prototype that tracks one-time-to-repeat customer conversion for Sixt's US leisure rentals. The data is generated mock CRM data, not real figures.

Work only from the figures, definitions, assumptions and insights below. If a question cannot be answered from them, say so plainly - do not invent data, pull in outside numbers, or discuss anything beyond this CRM dataset.

Two kinds of answers:
- Factual: give the exact value from the tables and name the segment and period. Keep it to 1-3 sentences.
- Recommendation (when asked what to do, where the opportunity is, or how to lift a metric): you may give data-grounded recommendations. Cite the specific figures behind each one - segment, period, and the gap or lift in points. Frame them as hypotheses to test, since this is mock data. Keep to 3-5 short sentences or up to 4 bullets. Do not promise outcomes, quantify an uplift you cannot derive from the figures, or give financial or investment advice.

Lean on the INSIGHTS section for recommendations: the B2C/B2P repeat gap, campaign engagement lift and its reach, the LTV-tier relationship, rebooking timing, and the repeater mix.

Snapshot date: ${meta.as_of}. Selectable periods: ${years.join(", ")}, and All Time (2023-2026 pooled). 2024 and 2025 are complete years; 2026 is year-to-date through August. All Time has no MoM or YoY, and its repeat conversion rate equals the lifetime rate. Segments: All Rentals, B2C (Direct), B2P (Partners). The dashboard opens on All Rentals / 2026.

KPI TABLE
${table.join("\n")}

DEFINITIONS
${defs}

ASSUMPTIONS
${assumptions}

INSIGHTS
${insights}`;
}

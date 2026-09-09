# Sixt CRM Dashboard - Implementation Plan

Phase-by-phase plan with success criteria. Check items off as each phase completes.

---

## Phase 1 - Planning and scaffolding

Set up the repository skeleton and this plan.

- [x] `PLAN.md` written with phases and success criteria
- [x] `git` repository initialised
- [x] Clean `.gitignore` covering Node/Next.js and Python/uv
- [x] Top-level structure created: `/app` (Next.js) and `/analytics` (Python + uv)
- [x] `BUILD.log` started, capturing user commands
- [x] `.env` is git-ignored (contains `OPENROUTER_API_KEY`)

---

## Phase 2 - Mock CRM data generation (Python / uv)

Generate ~4,000 customers with realistic rental histories and export one static JSON.

Scope:
- `analytics/` managed with `uv` (`pyproject.toml`, locked deps).
- Script simulates customer behaviour, seasonality, channel variance, LTV terciles, engagement.
- Computes KPIs and writes JSON to **both** `analytics/output/crm.json` and `app/public/data/crm.json`.
- JSON shape: `meta` (as_of, available years, definitions) + `customers[]` (channel, LTV, LTV tier, engagement, lifetime repeater flag, repeater type, `rentals[]` with `start`, `end`, `value`, sequence).

Success criteria:
- [x] Generator writes both `analytics/output/crm.json` and `app/public/data/crm.json`
- [x] Lifetime one-time customers = 70%; repeaters = 30% - asserted (exact by construction)
- [x] One-timers split exactly 50/50 B2C / B2P - 1,400 each, per the brief (asserted)
- [x] B2P one-time 80%; B2C one-time ~62% (exact by construction: 1400/1750, 1400/2250)
- [x] Total headcount tilts B2C ~56/44 (2,250 / 1,750) because B2P holds fewer repeaters - keeps the channel gap
- [x] No overlapping rentals; every later rental starts after the previous one ends (asserted)
- [x] Repeaters are only frequent (60-90 days) or seasonal (330-365 days) (asserted)
- [x] Monthly volume spikes Jun-Aug and Nov-Dec; Q1 materially lower; pattern repeats 2023-2026 (asserted)
- [x] Rentals exist from 2023 (YoY baseline) through 2026 (asserted)
- [x] High LTV tier has the highest repeat rate, and the tiers form a gradient (High 72% / Med 16% / Low 2%; asserted)
- [x] Engaged customers have a higher lifetime repeat rate than non-engaged (40% vs 19%; asserted)
- [x] Core Repeat Conversion Rate, All Rentals 2026 reads ~30% (30.6%; asserted 0.27-0.33)
- [x] B2C higher Gross Volume than B2P is present (2026: B2C 933 vs B2P 799; asserted)

Post-review rework (recs 1-4) + cohort-cliff fix:
- [x] 2023 is a near-full baseline year - 2024 YoY gross is flat (~-5%), not a +112% artefact (asserted < 15%)
- [x] Frequent repeaters can span calendar years - ~13% of customers rent across >1 year (asserted > 10%)
- [x] Cohort matrix has no Sep->Oct cliff: every first-rental month of a selectable year carries a realistic repeat mix (asserted per month)
- [x] Cohort 12+ horizon has signal for 2024/2025 (sparse by nature; asserted)
- [x] Jan/Feb repeat volume is non-zero for 2025 and 2026 (asserted)
- [x] LTV decoupled from rental count via per-customer lognormal price level (High/Med/Low repeat 65/22/3%; asserted gradient)
- [x] December 2026 is a real month (early-2027 continuation tail, never shown in UI); seasonality spikes hold for every year
- [~] 2026 (default) reads 33% All / 23% B2P; interior years 2024-2025 read low 40s - bounded-window effect, documented in meta.assumptions. Knobs: SEASONAL_SHARE / SUSTAINED_SHARE / 2026 one-time inflow weight

---

## Phase 3 - Next.js dashboard UI

Client-rendered Next.js app in `/app` reading the static JSON. Recharts + shadcn/ui + Tailwind.

Scope - six views on a single page:
1. Headline KPIs: Total Conversions (Gross Volume), First-Time vs Repeat stacked bar, Core Repeat Conversion Rate (orange), MoM + YoY (four figures)
2. Channel Breakdown (B2P vs B2C)
3. Marketing Engagement Breakdown
4. Customer Segments by LTV
5. Cohort & Frequency View (matrix + time-to-next-rental histogram)
6. Assumptions Panel

Controls: single global segment toggle `[All Rentals | B2C | B2P]` + year selector `[2024 | 2025 | 2026]`, default 2026. All recalculation client-side.

Success criteria (numbers after the ~30% retune + 2026-YTD rework):
- [x] App opens at All Rentals / 2026 with data populated
- [x] Gross Volume equals contract count for the selected year (2026 YTD 1,030 = JSON kpis.all.2026)
- [x] Stacked bar parts (1st Rent + 2+ Rents) sum to Gross Volume (709 + 321 = 1,030)
- [x] Repeat Conversion Rate: lifetime-based, orange, 30.2% on All/2026, with 30% lifetime baseline + one-time count beside it
- [x] Four trend figures present, split: Year-over-Year prominent (all positive), latest-month-vs-prior secondary with a seasonal caption
- [x] Business grows ~15%/year: gross 1330 / 1596 / 1820 / 1284(YTD); every displayed YoY positive (asserted)
- [x] Selected year visible; 2026 labelled "year-to-date through Aug"
- [x] B2C rises vs All (30.2% -> 41.3%); B2P falls vs All (-> 18.5%, ~20%)
- [x] Switching year updates every view; returning to All + 2026 restores numbers (verified via click-through)
- [x] No drilldowns, no extra navigation, no date-range picker
- [x] Channel view: B2C higher repeat; B2C leads Gross Volume; readable story
- [x] Engagement view: engaged 42.2% > not-engaged 18.2%
- [x] LTV view: High 65.3% / Medium 23.3% / Low 4.2%; gradient, High highest
- [x] Cohort matrix renders; histogram data has 60-90 and 330-365 clusters
- [x] Assumptions panel covers contracts vs customers, lifetime repeater rule, YTD, 70% baseline, channels, LTV terciles, engagement, cohort recency
- [x] Colour scheme: orange only on repeat-rate metrics/series, black type, white cards, gray neutrals
- [x] No emojis anywhere; no horizontal overflow (DOM verified); build + typecheck clean
- [~] Cohort matrix Oct-Dec (and Jun-Aug 2026) rows are near-zero - off-peak + recency; dimmed and captioned, not eliminated (trilemma with the ~30% rate + spec's rigid gap bands)
- [~] Full visual scroll-through: browser window kept backgrounding in this env; verified via page text + DOM instead

---

## Phase 4 - Validation check

- [x] A first-time viewer can understand Gross Volume, the orange repeat rate, selected year vs last year, and the channel gap from the page alone (headline states the one-time count + 30% baseline; Assumptions panel is inline; chat answers from the same figures)
- [x] Browser click-through: segment + year toggles verified to recalculate every view and restore on return; each view rendered and read via the running app

---

## Phase 5 - Chat assistant

- [x] Single API route `app/src/app/api/chat/route.ts` calling OpenRouter server-side (model `minimax/minimax-m3:free`)
- [x] Panel is a floating chat bubble (bottom-right): a round button that opens a panel overlaying the page, so the dashboard keeps its full width
- [x] API key never in the browser bundle (0 matches in `.next/static/` and `.next/server/`; read from `process.env` at runtime)
- [x] Model payload is `meta` (definitions + assumptions) + the precomputed `kpis` block, never the customer array
- [x] "What is the All Rentals repeat conversion rate?" -> 30.2% for 2026, matches the orange KPI
- [x] "How is Gross Volume defined?" -> "closed rental contracts... not unique customers", matches Assumptions
- [x] "How do B2C and B2P compare in 2026?" -> B2C 41.3% / B2P 18.5%, matches the dashboard
- [x] Missing `OPENROUTER_API_KEY` -> route returns 503 with a clean message; the page keeps working
- [x] Out-of-scope question (competitor / 2023) -> declines and explains

---

## Phase 6 - QA and close-out

- [x] Full QA checklist A-G from `AGENTS.md` re-run and passing (F verified live via the running route)
- [x] `BUILD.log` lists the user commands from this build
- [x] `README.md` short and sufficient to generate data and run the app

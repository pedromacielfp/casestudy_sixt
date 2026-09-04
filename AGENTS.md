# Sixt CRM Dashboard - MVP Specification

## Business Requirements
An MVP dashboard prototype tracking one-time-to-repeat customer conversion for Sixt's US leisure rentals.

### Core Baseline & Churn Rules
* 70% of leisure customers are one-time renters (lifetime); 30% are repeaters.
* Customer headcount is split exactly 50/50 B2C vs B2P.
* B2P one-time rate is ~80%; B2C is ~60%. Combined this is 70% overall. Among one-timers the mix is ~57% B2P / 43% B2C (B2P is acquisition-heavy).
* B2C can show higher Gross Volume than B2P because repeaters add extra contracts. The Channel view must make that readable; do not force B2P to "win" total volume.

### Metric Definitions (lock these; do not mix units)
Population for a selected year: unique customers with at least one rental whose start date falls in that year.

* **Total Conversions (Gross Volume):** count of closed rental contracts with start date in the selected year. This is contracts, not unique customers.
* **First-Time vs Repeat Split:** split Gross Volume by **rental sequence**, not by current customer type:
  * **1st Rent:** contracts that are that customer's first-ever rental.
  * **2+ Rents:** contracts that are that customer's 2nd or later rental.
  * A repeater's first contract still counts as 1st Rent. The two bar parts must sum to Gross Volume.
* **Core Repeat Conversion Rate (focal KPI, Accent Orange):** `(Unique customers in the population who are lifetime repeaters) / (Unique customers in the population)`.
  * Lifetime repeater = has 2 or more rentals anywhere in the dataset, even if only one of those rentals falls in the selected year.
  * Do **not** require 2+ rentals inside the selected year. Seasonal repeaters would otherwise look like one-timers and the All Rentals rate would fall well below 30%.
  * On All Rentals this rate must read ~30%.
* **MoM:** latest month of the selected year vs the month before, shown separately for 1st Rent volume and 2+ Rents volume.
* **YoY:** selected calendar year vs the previous calendar year (full year vs full year), shown separately for 1st Rent volume and 2+ Rents volume. Four trend figures total, not one blended number.

### Mock Data Behavior & Seasonality Rules
To ensure the dashboard looks realistic and presentation-ready, the Python data generation script must simulate actual customer behavior and temporal trends:
* **Time span:** Generate rental activity across three complete calendar years the UI can inspect (**2024, 2025, 2026**) plus **2023** only so 2024 YoY is defined. Treat each of 2024–2026 as a full year (no YTD partial year).
* **U.S. Leisure Seasonality:** Clear volume spike in Summer (June–August) and around the Winter Holidays (November–December). Q1 (January–March) must show significantly lower rental volumes. Seasonality must be visible in every generated year.
* **B2C vs. B2P Behavior Variance:**
  * **B2C (Direct):** Higher average lifetime value (LTV) per transaction, higher response rate to retention campaigns, higher organic repeat rate (~40% repeat / ~60% one-time).
  * **B2P (Partners/Brokers):** Steeper churn (~80% one-time), lower average order value due to broker commissions/discounts. Heavier share of one-time / first-rent volume, not necessarily higher Gross Volume.
* **Time-to-Next-Rental Logic:** Repeat bookings cannot be random. Repeaters are either:
  * **Frequent Leisure:** next rental 60–90 days later; over three years they may have 3+ rentals.
  * **Seasonal Leisure:** next rental 330–365 days later (annual vacation); over three years they typically have one trip per year.
* **Data Consistency:** Chronological integrity. Every later rental starts after the previous one ends. No overlapping rental periods for the same customer.
* **LTV tiers:** Split customers into High / Medium / Low by tercile of total spend (top / middle / bottom third). High must show the highest repeat conversion rate.
* **Engagement:** Assign campaign engagement (Email, Push, or SMS vs none) with a higher rate for B2C. Plant a higher lifetime repeat rate among engaged customers so the engagement chart has a clear story. State this in the Assumptions panel.
* The Python script must assert the 70% lifetime one-time rate and the 50/50 channel headcount when creating records.

### Layout Structure
Single page, six views only:
1. **Headline KPIs** — designed to instantly answer core conversion metrics at a glance:
   * **Total Conversions (Gross Volume):** absolute count of all closed rental contracts in the selected year.
   * **First-Time vs Repeat Split:** a two-part stacked horizontal bar breaking Gross Volume into 1st Rent and 2+ Rents.
   * **The Core Repeat Conversion Rate:** `(Unique Customers with >= 2 lifetime rentals) / (Total Unique Customers)` in the selected year population. Focal point in Accent Orange.
   * **MoM and YoY Trends:** dynamic percentages for both first-time volume and repeat volume.
2. **Channel Breakdown (B2P vs B2C):** Visual breakdown of volumes and repeat behaviors comparing direct vs partner performance.
3. **Marketing Engagement Breakdown:** Comparative repeat rate for customers who engaged with post-rental retention campaigns (Email, Push, or SMS) versus those who did not.
4. **Customer Segments by Lifetime Value:** High, medium, and low terciles mapped against their repeat conversion rates.
5. **Cohort & Frequency View:**
   * **Matrix:** rows = month of first rental in the selected year; columns = months since first rental (0–3, 3–6, 6–12, 12+); cell = percent of that cohort who have made a subsequent rental by that horizon.
   * **Distribution:** time-to-next-rental histogram with visible clusters at 60–90 days and 330–365 days.
6. **Assumptions Panel:** Inline text block stating Gross Volume vs Repeat Conversion Rate (contracts vs customers), lifetime vs in-year repeater rule, year control, 70% baseline, channel split, LTV terciles, and the planted engagement/repeat relationship. The page must be entirely self-explanatory.

### UX & Filtering Rules
* **Single Global Segment Control:** No drilldowns or multi-page navigation. One segment toggle: `[ All Rentals | B2C (Direct) | B2P (Partners) ]`.
* **Year Control:** Next to the segment toggle, one simple year selector: `[ 2024 | 2025 | 2026 ]`. Default **2026**. Not a date range picker. Changing the year filters every view to that calendar year and recalculates Gross Volume, the stacked bar, the orange rate, MoM, YoY (vs the previous year), and all charts.
* **Dynamic Interactivity:** Segment and year both instantly filter the static JSON in the browser and recalculate the whole page.
* **Data State:** The app must open with realistic dummy/mock CRM data already populated (All Rentals, year 2026).

## Technical Details
* Implemented as a modern NextJS app, client rendered.
* The NextJS app must be created in a subdirectory `/app`.
* Mock data is generated separately in Python (subdirectory `/analytics`, managed with `uv`) and exported as a static JSON file that the app reads.
* No persistence, no live data source, no user management for the MVP.
* Use popular libraries: `recharts` for charts, `shadcn/ui` for components, and `tailwindcss` for layout.
* JSON includes `meta` (as_of, available years, definitions) and `customers[]` with channel, LTV, LTV tier, engagement, lifetime repeater flag, repeater type, and `rentals[]` (`start`, `end`, `value`, sequence number).
* Scale: ~4,000 customers.

### Optional: Chat Assistant
* A small chat panel that can answer questions about the dashboard and the data behind it.
* The only backend logic allowed: one NextJS API route (`app/api/chat/route.ts`) that calls OpenRouter server-side so the API key is never exposed to the browser.
* Do **not** send the raw customer array to the model. Send `meta` plus a compact KPI summary (headline numbers, channel, engagement, LTV, year list) derived from the same JSON.
* Use a small OpenRouter model (e.g. `openai/gpt-4o-mini`).
* Build this only after the core dashboard above is completely finished and working.

## Color Scheme
* **Accent Orange (#FF5F00):** Focal KPIs, key chart series, and critical highlights (use sparingly). The Repeat Conversion Rate is the primary orange element.
* **Black (#000000):** Headings, body text, axes, and neutral chart series.
* **White (#FFFFFF):** Layout backgrounds and individual visualization cards.
* **Gray Neutrals (Black at 4%, 8%, 16%, and 55% opacity):** Component borders, chart gridlines, muted labels, and secondary data series.

## Strategy & Implementation Steps
1. Write a phase-by-phase plan with success criteria for each phase to be checked off. Include project scaffolding and a clean `.gitignore`.
2. Generate mock CRM data using Python, computing the exact KPIs, LTV clusters, engagement, and year boundaries into a single static JSON file.
3. Build the NextJS dashboard UI against that JSON file.
4. Perform a validation check: ensure a user can instantly understand Gross Volume, the orange repeat rate, the selected year vs last year, and the channel gap from the page alone, with no other file open.
5. Add the chat assistant API route last, only once the dashboard passes the validation check.
6. Run the QA checklist below. The project is only complete when the MVP is finished, running, and all QA items pass.

## Coding Standards
* Use the latest versions of libraries and idiomatic frontend approaches.
* Keep it simple. Never over-engineer. Always simplify. No unnecessary defensive programming or extra unrequested features.
* Be concise. Keep the README file minimal.
* IMPORTANT: Do not use emojis anywhere in the user interface, documentation, or codebase.

## QA Checklist
Fail any item = fix, then re-run that section. Browser checks must click through the running app; a single screenshot is not enough.

### A. Data generation
* Generator writes both `analytics/output/crm.json` and `app/public/data/crm.json`.
* Lifetime one-time customers = 70%; repeaters = 30%.
* B2C vs B2P unique-customer headcount is 50/50; B2P one-time ~80%; B2C ~60%.
* No overlapping rentals; every later rental starts after the previous one ends.
* Repeaters are only frequent (60–90 days) or seasonal (330–365 days).
* Monthly volumes spike Jun–Aug and Nov–Dec; Q1 is materially lower; pattern repeats in 2024, 2025, and 2026.
* Rentals exist for 2023 (YoY baseline) through 2026.

### B. Headline KPIs (All Rentals, 2026)
* Gross Volume equals contract count in 2026 (spot-check JSON).
* Stacked bar parts sum to Gross Volume (1st Rent + 2+ Rents).
* Repeat Conversion Rate uses lifetime repeater status, is orange, and reads ~30%.
* Four trend figures: first-time MoM, first-time YoY, repeat MoM, repeat YoY.
* Selected year is visible on the page.

### C. Filters
* Default: All Rentals, year 2026, data populated.
* B2C: repeat rate rises vs All. B2P: repeat rate falls vs All (~20%).
* Switching 2026 to 2025 (then 2024) updates every view; YoY is vs the previous year.
* Return to All + 2026 restores the original numbers.
* No extra navigation, no date range picker.

### D. Other views
* Channel: B2C higher repeat; Gross Volume may favor B2C; story is readable.
* Engagement: engaged repeat rate is higher than not-engaged.
* LTV: High / Medium / Low each have a rate; High is highest.
* Cohort matrix and 60–90 / 330–365 day clusters are visible.
* Assumptions panel covers contracts vs customers, lifetime repeater rule, years, 70% baseline, channels, LTV terciles, engagement.

### E. Visual and copy
* Orange used sparingly; black type; white cards; gray neutrals for borders/grid/muted labels.
* No emojis in UI, README, comments, or generated copy.
* Desktop layout does not overflow or collide.

### F. Chat (after dashboard QA passes)
* Panel present; API key not in the browser bundle.
* "What is the All Rentals repeat conversion rate?" matches the orange KPI (~30% for 2026).
* "How is Gross Volume defined?" matches Assumptions (contracts, not customers).
* A B2C vs B2P or year question agrees with the dashboard.
* Missing `OPENROUTER_API_KEY` fails cleanly without crashing the page.

### G. Close-out
* `BUILD.log` lists the user commands from this build.
* README is short and sufficient to generate data and run the app.

MVP is done only when A–G all pass.

## AFTER
* Please save all the commands I gave in BUILD.log

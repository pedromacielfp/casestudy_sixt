# Converting the 70% — walkthrough script

Speaking notes for `walkthrough-deck.pdf` (10 slides, ~8 minutes). First person,
plain delivery. Each slide: **On screen** / **Say** / **Transition**. Figures are
from the generated mock dataset behind the Sixt CRM Dashboard.

Two questions this answers:
1. Three initiatives that could lift the one-time-to-repeat conversion rate.
2. How I would measure each one, and whether it moves the goal.

---

## Slide 1 — Converting the 70%

**On screen:** Title, one-line framing, north-star.

**Say:**
"The brief is a leisure book that's growing double digits but where most customers
rent once and never come back. I built a dashboard to see where that happens, and
I'm going to use it to justify three CRM experiments. The north-star throughout is
one number — the Core Repeat Conversion Rate — and every initiative reads out on it."

**Transition:** "Let me start with the problem the dashboard makes visible."

---

## Slide 2 — The problem

**On screen:** "70% rent once" statement; Headline KPIs screenshot (All Rentals, 2026).

**Say:**
"Seventy percent of customers in the dataset rent once and never return —
2,800 of 4,000, and per the brief they split exactly 50/50 between the direct and
partner channels, 1,400 each. The orange number is the one I care about: unique
lifetime repeaters divided by all unique customers in the period. It sits just
above its 30% lifetime baseline and it moves year to year — 34.5, then 36.6, then
32.7 year-to-date in 2026. The dashboard has one segment toggle and one year
selector, and six views. Each of my three initiatives is anchored to one of those
views — so this isn't three guesses, it's three gaps the data already shows."

**Transition:** "First gap — marketing engagement."

---

## Slide 3 — Signal for Initiative 1: Marketing Engagement

**On screen:** "Reached customers repeat at twice the rate"; Engagement + LTV screenshot.

**Say:**
"Customers who got a retention campaign repeat at about 44%; those who didn't, at
about 20%. Now — that relationship is planted in the mock data and it's
correlational, so I'm not claiming the campaign causes the lift. What I am
claiming is the reach gap is real leverage: about two-thirds of direct customers
get touched by a campaign, but only 39% of partner customers do. We're not even
running the programme against the people most likely to churn.
One aside — the High-LTV tier repeats at 69%, but that's a spend-level proxy, not
a lever. It tells me where the value is, not what to send."

**Transition:** "So Initiative 1 is about closing that reach gap."

---

## Slide 4 — Initiative 1: Post-rental retention flow

**On screen:** Title, the bet, hypothesis, A/B test spec, success metric, impact.

**Say:**
"Put every one-time renter into a light four-touch flow after the trip —
thank-you, destination tips, a day-75 'ready for your next trip', a win-back at
day 200. The bet is that the block for most one-timers is memory at the next trip
decision, not intent.
I'd test it as a straight 50/50 holdout, assigned when the car comes back, running
continuously. Treatment gets the flow; control gets transactional mail only.
The primary metric is the repeat conversion rate at 365 days, treatment versus
control — I ship on a 2-point absolute lift at 95% confidence. Guardrails are
unsubscribe rate and margin per rental.
Impact: this one is direct — the primary metric *is* the north-star. A 3-point
lift across the enrolled base moves the blended rate about 2 points."

**Transition:** "Second gap — and it's the biggest structural one — the channel split."

---

## Slide 5 — Signal for Initiative 2: Channel Breakdown

**On screen:** "Same intake, half the retention"; Channel Breakdown screenshot.

**Say:**
"Partner customers repeat at 21%, direct customers at 42%. Here's the key: the
business acquires the same number of one-time customers through each channel —
about 1,400 each — but partner runs 80% one-time versus direct's 62%. Same
acquisition cost, far worse retention, so partner is the single biggest drag on
the blended number. Direct can still show more Gross Volume because its repeaters
book extra contracts, so this isn't a volume problem. It's a relationship
problem: a broker booking never creates the account, the saved card, or the
marketing consent that a direct booking does."

**Transition:** "So Initiative 2 tries to create that relationship, once."

---

## Slide 6 — Initiative 2: Move B2P onto a direct relationship

**On screen:** Title, the bet, hypothesis, A/B test spec, success metric, impact.

**Say:**
"At pickup or return, prompt the partner customer to create a direct Sixt account,
with a bounded incentive on their next booking on sixt.com — 25 euros off,
expires in six months. The bet is that one direct booking establishes the account,
the payment method and the consent, and the relationship follows. That should
move the partner repeat rate about a third of the way toward direct — from ~20%
to ~26%.
Randomise at pickup, 50/50, stratified by broker partner so no single partner
skews it. Primary metric is the 365-day repeat rate of treated partner customers
versus control, and I'd watch the funnel underneath — account created, next rental
booked direct, incentive redeemed. Guardrail is that incremental margin per
converted customer stays positive after the incentive cost.
Impact: closing even a third of that gap across the ~1,750 partner customers
lifts the blended rate 2 to 3 points."

**Transition:** "Third gap — timing. When does rebooking actually happen?"

---

## Slide 7 — Signal for Initiative 3: Cohort & Frequency

**On screen:** "Rebooking happens in two windows"; Cohort matrix + histogram screenshot.

**Say:**
"Time-to-next-rental isn't spread out — it's two clean clusters. About 1,090
customers rebook at 60 to 90 days; those are the frequent renters. A much smaller
group, around 110, rebook at roughly a year — the annual-trip renters.
The cohort matrix adds a timing problem on top. Customers acquired January to
September rebook at about 38% ever. Customers acquired October to December rebook
at 2 to 6%. They're acquired off-peak, and a fixed monthly newsletter almost never
lands inside either planning window."

**Transition:** "So Initiative 3 is purely a timing change."

---

## Slide 8 — Initiative 3: Time re-engagement to the rebooking windows

**On screen:** Title, the bet, hypothesis, A/B test spec, success metric, impact.

**Say:**
"Replace the generic monthly newsletter with two behaviour-timed triggers — a
'next trip?' nudge at day 75, and a 'book your summer trip again' reminder at month
11 for summer renters. Same people as Initiative 1 — this rides on that enrolled
population, it's not a new audience.
Split 50/50 within that group, stratified by acquisition month so I can read the
off-peak cohort separately. Primary metric is second-rental rate at 120 days for
the frequent arm and 400 days for the seasonal arm. I also track incremental
conversions per thousand sends, because send volume should stay flat or drop.
Impact: I've rated this medium. The standalone seasonal effect is small — that
arm is only about 110 customers today. But it multiplies Initiative 1 through
better timing, and it's the one thing that rescues the near-zero Q4 cohort."

**Transition:** "All three read out the same way — here's the measurement spine."

---

## Slide 9 — How every test is measured

**On screen:** Six-row framework — north-star, design, incrementality, decision rule, guardrails, power.

**Say:**
"The north-star is the same for all three: lifetime repeaters over cohort size,
read at fixed horizons — 90, 180, 365, and 400 days — because rebooking is
bimodal and a single readout date would miss one of the clusters.
Design is always a randomised holdout, never before-and-after — with double-digit
growth and heavy seasonality, a pre/post read would be measuring the calendar,
not the campaign.
On top of the individual tests there's a permanent 10% global control that never
gets any CRM contact, so we can always answer 'what is the whole programme worth'.
Decision rule: ship on at least a 2-point absolute lift at 95% confidence, and
only if margin per customer hasn't gone down.
On power — detecting 2 points on a 20% base needs about 6,500 customers per arm.
Initiatives 1 and 3 hit that in a quarter; Initiative 2, partner-only, takes four
to five months."

**Transition:** "Last slide — what I'd actually run first."

---

## Slide 10 — Sequencing & close

**On screen:** Run order (parallel / then / if only one); honest caveats; the through-line.

**Say:**
"I'd run 1 and 2 in parallel — different populations, no interference — and start
3 once Initiative 1 has a stable enrolled base, about a month in.
If I could only ship one, it's Initiative 1: widest population, fastest read, and
its primary metric is the goal itself.
Two honest caveats. This is mock data, so the effect sizes I quoted are targets
the tests would establish, not promises. And the Q4 rebooking cliff is partly a
property of how the data was generated — though off-peak leisure renters being
less repeat-prone is a plausible real effect, and that's exactly what the test
would confirm.
The through-line: every initiative targets something Sixt can actually pull — a
message, a prompt, a cadence — and every one is judged on the same orange number."

**Transition:** "Happy to go deeper on any of the three, or open the live dashboard."

---

## Anticipated questions

- **"The brief says one-timers split 50/50 by channel — does the data respect that?"**
  Yes, exactly: 1,400 one-time B2C and 1,400 one-time B2P. Total headcount then
  tilts to B2C (about 56/44, ~2,250 / ~1,750) because B2C retains better and so
  accumulates more repeaters over time. The brief specifies the one-timer split,
  not the headcount split.

- **"Then why isn't total headcount 50/50?"**
  It can't be, given the rest of the brief. If one-timers are 50/50 *and*
  headcount is 50/50 *and* overall churn is 70%, then B2C and B2P have identical
  repeat rates by arithmetic — and the channel gap, the whole basis for
  Initiative 2, disappears. Letting headcount float is what keeps the model
  internally consistent.

- **"Why not an LTV initiative? High-LTV repeats at 69%."**
  LTV tier is defined by total spend, so it's downstream of repeat behaviour, not
  a lever. I can target *price level* (trade-up offers) but I can't target "be
  high-LTV". The three initiatives act on mechanisms, not on an outcome variable.

- **"Your cohort matrix shows Jan-2026 acquisitions rebooking at 64%. That
  contradicts 70% one-time."**
  Different denominators. 70% is the *lifetime* rate across the whole base.
  Early-month cohorts in a single year are enriched for frequent repeaters who
  complete their 60–90-day burst inside that calendar year, so their in-year
  rebooking looks high. The lifetime and All-Time rates still read ~30%.

- **"The engagement lift is planted in the data — isn't Initiative 1 circular?"**
  The *lift* is correlational and I don't lean on its size. Initiative 1 is
  justified by the *reach gap* (39% vs 64%), which is a coverage fact, and the
  test is what would establish a real causal effect.

- **"Isn't €25 off every B2P next booking expensive?"**
  That's why the guardrail is incremental margin per converted customer after
  incentive cost, and why the control isolates customers who'd have rebooked
  anyway. If the incrementality isn't there, it doesn't ship.

- **"Why 400 days as a readout horizon?"**
  The seasonal cluster rebooks at ~330–365 days. A 365-day readout would cut it
  off mid-window; 400 captures it with margin.

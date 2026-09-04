"""Generate mock Sixt US leisure CRM data and export a single static JSON file.

Run: uv run python generate.py

Writes analytics/output/crm.json and app/public/data/crm.json.

The model:
  - 4,000 customers, exactly 50/50 B2C / B2P by headcount.
  - Lifetime one-time rate is fixed by channel: B2P 80% one-time, B2C 60% one-time,
    which averages to 70% overall. Among one-timers the mix is ~57% B2P / 43% B2C.
  - Repeaters follow one of three profiles:
      * concentrated  - a short burst of 2-4 rentals 60-90 days apart, confined to
                        its first calendar year. Most repeaters. Keeps the yearly
                        population repeat rate close to the 30% lifetime rate.
      * sustained     - a frequent renter (60-90 day gaps) retained across 2-3 years
      * seasonal      - one trip per summer, ~365 days apart, spanning 2-4 years
    B2P repeaters skew heavily concentrated. About 4% of customers rent across more
    than one calendar year.
  - The year control inspects 2024, 2025 (complete years) and 2026 (year-to-date
    through August, the last closed month - nothing is dated later). 2023 is the YoY
    baseline, not selectable. Acquisition grows ~15% a year (assigned deterministically
    so the growth shows cleanly in the YoY figures), so every displayed YoY is
    positive. Every year has a summer (Jun-Aug) spike and a quiet Q1; the complete
    years also spike at the winter holidays.
  - The yearly repeat conversion rate sits a little above the 30% lifetime rate
    (repeaters recur, so they are over-represented in any single year) and trends
    up across the complete years: 2024 ~35% (fast, one-timer-heavy acquisition
    diluted it), 2025 ~37%, 2026 ~33% year-to-date. Because concentrated bursts
    are confined to their first year, first-rental cohorts from October onward
    carry few repeaters - an off-peak-acquisition effect, not just censoring.
  - Rental value is daily_rate * duration. Each customer carries a lognormal price
    level that scales all of their rentals independently of how often they rent, so
    the LTV tiers form a gradient rather than a repeater / one-timer proxy.
  - Engagement is more common for B2C and is planted onto repeaters so the
    engagement breakdown has a clear story. High LTV tier repeats the most.
"""

from __future__ import annotations

import json
import random
import statistics
from datetime import date, timedelta
from pathlib import Path

SEED = 42
N_CUSTOMERS = 4000
BASELINE_YEAR = 2023
AVAILABLE_YEARS = [2024, 2025, 2026]
ALL_YEARS = [2023, 2024, 2025, 2026]

# Snapshot date. 2024 and 2025 are complete years; 2026 is year-to-date through
# the end of August (the last closed month). Nothing is dated after this.
CURRENT_YEAR = 2026
CURRENT_MONTH = 8
DATA_START = date(2023, 1, 1)
DATA_END = date(CURRENT_YEAR, CURRENT_MONTH, 31)
AS_OF = DATA_END.isoformat()

# Channel behaviour.
CHANNEL_ONE_TIME_RATE = {"B2P": 0.80, "B2C": 0.60}

# Repeater profiles as a share of all repeaters (concentrated takes the rest).
# "concentrated" burns out inside its first calendar year, so it keeps the yearly
# population repeat rate close to the 30% lifetime rate. "sustained" and "seasonal"
# are the smaller retained base that recurs across calendar years.
SEASONAL_SHARE = 0.10
SUSTAINED_SHARE = 0.095

# Rental economics. value = daily_rate * duration_days.
CHANNEL_DAILY_RATE = {"B2C": (80.0, 17.0), "B2P": (55.0, 13.0)}  # (mean, stdev) USD/day
DAILY_RATE_FLOOR = 28.0
PREMIUM_SIGMA = 0.42          # lognormal spread of a customer's price level
DURATION_TRIANGULAR = (2, 20, 4)  # min, max, mode days -> most rentals 3-6 days

# Engagement probability by channel, with a bonus that plants the repeat story.
ENGAGEMENT_BASE = {"B2C": 0.58, "B2P": 0.34}
ENGAGEMENT_REPEATER_BONUS = 0.18

# Monthly seasonality weights: strong summer, holiday bump, quiet Q1.
MONTH_WEIGHTS = {
    1: 0.46, 2: 0.48, 3: 0.62, 4: 0.86, 5: 1.08, 6: 1.50,
    7: 1.66, 8: 1.66, 9: 1.00, 10: 0.80, 11: 1.52, 12: 1.86,
}
SEASONAL_FIRST_MONTHS = [6, 7, 8]  # the annual-summer-vacation renter
# A concentrated burst is confined to its first calendar year, so months are capped
# to leave room for the 60-90 day gaps (Sep start + 90 days still lands in December).
# 2026 stops in August, so its bursts must start by June.
CONCENTRATED_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
CONCENTRATED_MONTHS_CURRENT = [1, 2, 3, 4, 5]

# Year of the customer's first rental. Acquisition grows year over year - the
# business is healthy. Counts per year are assigned deterministically (not sampled)
# so the growth shows through cleanly in the YoY figures. 2026 is a partial year
# (Jan-Aug), sized so its year-to-date is a modest step up on Jan-Aug 2025.
# 2024 is deliberately the weaker acquisition year for repeaters and the stronger
# one for one-timers, so the yearly Repeat Conversion Rate trends up 2024 -> 2025
# rather than sitting flat.
FIRST_YEAR_ONE_TIME = {2023: 0.26, 2024: 0.31, 2025: 0.33, 2026: 0.29}
FIRST_YEAR_CONCENTRATED = {2023: 0.24, 2024: 0.25, 2025: 0.30, 2026: 0.25}
SUSTAINED_YEAR_WEIGHTS = {2023: 0.28, 2024: 0.36, 2025: 0.36}
SEASONAL_YEAR_WEIGHTS = {2: {2023: 0.28, 2024: 0.36, 2025: 0.36},
                         3: {2023: 0.42, 2024: 0.58},
                         4: {2023: 1.00}}

CONCENTRATED_COUNT_WEIGHTS = {2: 0.50, 3: 0.40, 4: 0.10}
SUSTAINED_COUNT_WEIGHTS = {5: 0.32, 6: 0.30, 7: 0.22, 8: 0.11, 9: 0.05}
SEASONAL_COUNT_WEIGHTS = {2: 0.58, 3: 0.34, 4: 0.08}

FREQUENT_GAP = (60, 90)
SEASONAL_GAP = (330, 365)


def weighted_choice(rng: random.Random, weights: dict):
    keys = list(weights)
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def pick_month(rng: random.Random, allowed: list[int] | None = None) -> int:
    months = allowed or list(MONTH_WEIGHTS)
    return rng.choices(months, weights=[MONTH_WEIGHTS[m] for m in months], k=1)[0]


def random_day_in_month(rng: random.Random, year: int, month: int) -> date:
    if month == 12:
        last = 31
    else:
        last = (date(year, month + 1, 1) - timedelta(days=1)).day
    return date(year, month, rng.randint(1, last))


def build_channels(rng: random.Random) -> list[str]:
    half = N_CUSTOMERS // 2
    channels = ["B2C"] * half + ["B2P"] * half
    rng.shuffle(channels)
    return channels


def assign_repeater_flags(rng: random.Random, channels: list[str]) -> list[bool]:
    """Deterministic repeater counts per channel so the marginals land exactly."""
    flags = [False] * N_CUSTOMERS
    for channel in ("B2C", "B2P"):
        idx = [i for i, c in enumerate(channels) if c == channel]
        n_repeaters = round(len(idx) * (1 - CHANNEL_ONE_TIME_RATE[channel]))
        for i in rng.sample(idx, n_repeaters):
            flags[i] = True
    return flags


# B2P (broker/partner) repeaters rarely build a multi-year relationship - most
# repeat once or twice and move on - so they skew toward the concentrated profile.
PROFILE_SCALE = {"B2C": 1.0, "B2P": 0.4}


def repeater_profile(rng: random.Random, channel: str) -> str:
    scale = PROFILE_SCALE[channel]
    roll = rng.random()
    if roll < SEASONAL_SHARE * scale:
        return "seasonal"
    if roll < (SEASONAL_SHARE + SUSTAINED_SHARE) * scale:
        return "sustained"
    return "concentrated"


def rental(rng: random.Random, channel: str, premium: float, seq: int, start: date) -> dict:
    duration = round(rng.triangular(*DURATION_TRIANGULAR))
    mean, stdev = CHANNEL_DAILY_RATE[channel]
    daily = max(DAILY_RATE_FLOOR, rng.gauss(mean, stdev) * premium)
    return {
        "seq": seq,
        "start": start.isoformat(),
        "end": (start + timedelta(days=duration)).isoformat(),
        "value": round(daily * duration, 2),
    }


def chain(rng: random.Random, channel: str, premium: float, first: date,
          gap: tuple[int, int], stop: date, max_rentals: int) -> list[dict]:
    """Rentals from `first`, each gap days after the previous start, up to `stop`."""
    rentals = [rental(rng, channel, premium, 1, first)]
    while len(rentals) < max_rentals:
        nxt = date.fromisoformat(rentals[-1]["start"]) + timedelta(days=rng.randint(*gap))
        if nxt > stop:
            break
        rentals.append(rental(rng, channel, premium, len(rentals) + 1, nxt))
    return rentals


def assign_years(rng: random.Random, count: int, weights: dict[int, float]) -> list[int]:
    """Deterministic first-year assignment: exact counts per the weights, shuffled."""
    total = sum(weights.values())
    years: list[int] = []
    for y, w in weights.items():
        years += [y] * round(count * w / total)
    keys = list(weights)
    j = 0
    while len(years) < count:
        years.append(keys[j % len(keys)])
        j += 1
    del years[count:]
    rng.shuffle(years)
    return years


def repeat_count(rng: random.Random, profile: str | None) -> int:
    if profile == "seasonal":
        return weighted_choice(rng, SEASONAL_COUNT_WEIGHTS)
    if profile == "sustained":
        return weighted_choice(rng, SUSTAINED_COUNT_WEIGHTS)
    if profile == "concentrated":
        return weighted_choice(rng, CONCENTRATED_COUNT_WEIGHTS)
    return 1


def build_rental_chain(rng: random.Random, channel: str, premium: float,
                       profile: str | None, first_year: int, n: int) -> list[dict]:
    if profile is None:  # one-timer
        months = list(range(1, CURRENT_MONTH + 1)) if first_year == CURRENT_YEAR else None
        start = random_day_in_month(rng, first_year, pick_month(rng, months))
        return [rental(rng, channel, premium, 1, start)]

    if profile == "seasonal":
        start = random_day_in_month(rng, first_year, pick_month(rng, SEASONAL_FIRST_MONTHS))
        return chain(rng, channel, premium, start, SEASONAL_GAP, DATA_END, n)

    if profile == "sustained":
        start = random_day_in_month(rng, first_year, pick_month(rng))
        return chain(rng, channel, premium, start, FREQUENT_GAP, DATA_END, n)

    # concentrated: a short burst of 2-4 rentals 60-90 days apart, confined to its
    # first calendar year (or, for 2026, to the snapshot). In 2026 the start month
    # is drawn flat across Jan-May so the year-to-date monthly shape is not skewed
    # by the burst-must-finish-by-August constraint.
    if first_year == CURRENT_YEAR:
        month, stop = rng.choice(CONCENTRATED_MONTHS_CURRENT), DATA_END
    else:
        month, stop = pick_month(rng, CONCENTRATED_MONTHS), date(first_year, 12, 31)
    start = random_day_in_month(rng, first_year, month)
    return chain(rng, channel, premium, start, FREQUENT_GAP, stop, n)


def assign_engagement(rng: random.Random, channel: str, is_repeater: bool) -> str:
    p = ENGAGEMENT_BASE[channel] + (ENGAGEMENT_REPEATER_BONUS if is_repeater else 0.0)
    if rng.random() < p:
        return rng.choice(["Email", "Push", "SMS"])
    return "None"


def build_customers(rng: random.Random) -> list[dict]:
    channels = build_channels(rng)
    repeater_flags = assign_repeater_flags(rng, channels)

    # Pass 1: fix each customer's channel, price level, profile and repeat count.
    specs: list[dict] = []
    for i in range(N_CUSTOMERS):
        channel = channels[i]
        premium = rng.lognormvariate(0.0, PREMIUM_SIGMA)
        profile = repeater_profile(rng, channel) if repeater_flags[i] else None
        specs.append({
            "channel": channel,
            "premium": premium,
            "profile": profile,
            "n": repeat_count(rng, profile),
            "first_year": 0,
        })

    # Assign first-year deterministically per profile group so acquisition growth
    # shows through cleanly (no sampling noise on the yearly counts).
    def assign_group(members: list[dict], weights: dict[int, float]) -> None:
        for m, y in zip(members, assign_years(rng, len(members), weights)):
            m["first_year"] = y

    for ch in ("B2C", "B2P"):
        pool = [s for s in specs if s["channel"] == ch]
        assign_group([s for s in pool if s["profile"] is None], FIRST_YEAR_ONE_TIME)
        assign_group([s for s in pool if s["profile"] == "concentrated"], FIRST_YEAR_CONCENTRATED)
        assign_group([s for s in pool if s["profile"] == "sustained"], SUSTAINED_YEAR_WEIGHTS)
        for count in SEASONAL_COUNT_WEIGHTS:
            assign_group(
                [s for s in pool if s["profile"] == "seasonal" and s["n"] == count],
                SEASONAL_YEAR_WEIGHTS[count],
            )

    # Pass 2: build the rental chains.
    customers: list[dict] = []
    for i, s in enumerate(specs):
        rentals = build_rental_chain(
            rng, s["channel"], s["premium"], s["profile"], s["first_year"], s["n"]
        )
        is_repeater = len(rentals) >= 2
        repeater_type = None
        if is_repeater:
            repeater_type = "seasonal" if s["profile"] == "seasonal" else "frequent"

        customers.append({
            "id": f"C{i + 1:05d}",
            "channel": s["channel"],
            "ltv": round(sum(r["value"] for r in rentals), 2),
            "ltv_tier": None,  # filled once every spend is known
            "engagement": assign_engagement(rng, s["channel"], is_repeater),
            "engaged": None,   # filled below
            "lifetime_repeater": is_repeater,
            "repeater_type": repeater_type,
            "rentals": rentals,
        })

    for c in customers:
        c["engaged"] = c["engagement"] != "None"

    assign_ltv_tiers(customers)
    return customers


def assign_ltv_tiers(customers: list[dict]) -> None:
    spends = sorted(c["ltv"] for c in customers)
    lo, hi = statistics.quantiles(spends, n=3)
    for c in customers:
        if c["ltv"] <= lo:
            c["ltv_tier"] = "Low"
        elif c["ltv"] <= hi:
            c["ltv_tier"] = "Medium"
        else:
            c["ltv_tier"] = "High"


# --------------------------------------------------------------------------- KPIs


def in_segment(customer: dict, segment: str) -> bool:
    return segment == "all" or customer["channel"] == segment


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous, 4)


def period_end(year: int) -> int:
    """Last month with data for a year: August for the current (YTD) year, else 12."""
    return CURRENT_MONTH if year == CURRENT_YEAR else 12


def year_volumes(customers: list[dict], segment: str, year: int, max_month: int = 12) -> dict:
    first_rent = repeat_rent = 0
    monthly = {m: {"first": 0, "repeat": 0} for m in range(1, 13)}
    for c in customers:
        if not in_segment(c, segment):
            continue
        for r in c["rentals"]:
            start = date.fromisoformat(r["start"])
            if start.year != year or start.month > max_month:
                continue
            bucket = "first" if r["seq"] == 1 else "repeat"
            monthly[start.month][bucket] += 1
            if r["seq"] == 1:
                first_rent += 1
            else:
                repeat_rent += 1
    return {"first_rent": first_rent, "repeat_rent": repeat_rent, "monthly": monthly}


def compute_kpis(customers: list[dict], segment: str, year: int) -> dict:
    vol = year_volumes(customers, segment, year)
    # YoY compares the same slice of the calendar in both years, so a year-to-date
    # current year is measured against the same months of the year before.
    period = period_end(year)
    prev = year_volumes(customers, segment, year - 1, max_month=period)

    population = 0
    repeaters = 0
    for c in customers:
        if not in_segment(c, segment):
            continue
        if any(date.fromisoformat(r["start"]).year == year for r in c["rentals"]):
            population += 1
            if c["lifetime_repeater"]:
                repeaters += 1

    last_month = max((m for m, v in vol["monthly"].items() if v["first"] + v["repeat"] > 0),
                     default=period)
    cur_m = vol["monthly"][last_month]
    prev_m = vol["monthly"][last_month - 1] if last_month > 1 else {"first": 0, "repeat": 0}

    return {
        "gross_volume": vol["first_rent"] + vol["repeat_rent"],
        "first_rent_volume": vol["first_rent"],
        "repeat_rent_volume": vol["repeat_rent"],
        "population": population,
        "lifetime_repeaters_in_population": repeaters,
        "repeat_conversion_rate": round(repeaters / population, 4) if population else 0.0,
        "months_of_data": period,
        "latest_month": last_month,
        "mom_first_rent": pct_change(cur_m["first"], prev_m["first"]),
        "mom_repeat_rent": pct_change(cur_m["repeat"], prev_m["repeat"]),
        "yoy_first_rent": pct_change(vol["first_rent"], prev["first_rent"]),
        "yoy_repeat_rent": pct_change(vol["repeat_rent"], prev["repeat_rent"]),
    }


def compute_all_time_kpis(customers: list[dict], segment: str) -> dict:
    """Pooled KPIs over every rental in the dataset. No period, so no MoM / YoY.
    The repeat conversion rate here equals the lifetime rate exactly, because the
    population is every customer counted once."""
    first = repeat = population = repeaters = 0
    for c in customers:
        if not in_segment(c, segment):
            continue
        if not c["rentals"]:
            continue
        population += 1
        if c["lifetime_repeater"]:
            repeaters += 1
        for r in c["rentals"]:
            if r["seq"] == 1:
                first += 1
            else:
                repeat += 1
    return {
        "gross_volume": first + repeat,
        "first_rent_volume": first,
        "repeat_rent_volume": repeat,
        "population": population,
        "lifetime_repeaters_in_population": repeaters,
        "repeat_conversion_rate": round(repeaters / population, 4) if population else 0.0,
        "months_of_data": None,
        "latest_month": None,
        "mom_first_rent": None,
        "mom_repeat_rent": None,
        "yoy_first_rent": None,
        "yoy_repeat_rent": None,
    }


def build_kpi_block(customers: list[dict]) -> dict:
    block: dict = {}
    for segment in ("all", "B2C", "B2P"):
        block[segment] = {
            str(year): compute_kpis(customers, segment, year) for year in AVAILABLE_YEARS
        }
        block[segment]["all_time"] = compute_all_time_kpis(customers, segment)
    return block


# ---------------------------------------------------------------------- assertions


def rate(part: int, whole: int) -> float:
    return part / whole if whole else 0.0


def active_years(customer: dict) -> set[int]:
    return {date.fromisoformat(r["start"]).year for r in customer["rentals"]}


def check(customers: list[dict], kpis: dict) -> None:
    b2c = [c for c in customers if c["channel"] == "B2C"]
    b2p = [c for c in customers if c["channel"] == "B2P"]
    assert len(b2c) == len(b2p) == N_CUSTOMERS // 2, "channel headcount is not 50/50"

    one_timers = [c for c in customers if not c["lifetime_repeater"]]
    one_time_rate = rate(len(one_timers), len(customers))
    assert 0.68 <= one_time_rate <= 0.72, f"lifetime one-time rate {one_time_rate:.3f}"

    b2p_ot = rate(sum(not c["lifetime_repeater"] for c in b2p), len(b2p))
    b2c_ot = rate(sum(not c["lifetime_repeater"] for c in b2c), len(b2c))
    assert 0.76 <= b2p_ot <= 0.84, f"B2P one-time rate {b2p_ot:.3f}"
    assert 0.56 <= b2c_ot <= 0.64, f"B2C one-time rate {b2c_ot:.3f}"

    b2p_share_of_ot = rate(sum(c["channel"] == "B2P" for c in one_timers), len(one_timers))
    assert 0.53 <= b2p_share_of_ot <= 0.61, f"B2P share of one-timers {b2p_share_of_ot:.3f}"

    # Chronology: no overlapping rentals for a customer.
    for c in customers:
        rs = c["rentals"]
        for a, b in zip(rs, rs[1:]):
            assert date.fromisoformat(b["start"]) > date.fromisoformat(a["end"]), \
                f"overlapping rentals for {c['id']}"

    # Repeat gaps are only frequent or seasonal.
    for c in customers:
        rs = c["rentals"]
        for a, b in zip(rs, rs[1:]):
            gap = (date.fromisoformat(b["start"]) - date.fromisoformat(a["start"])).days
            assert (58 <= gap <= 92) or (326 <= gap <= 368), f"gap {gap} out of band for {c['id']}"

    # No rental starts after the snapshot.
    assert all(date.fromisoformat(r["start"]) <= DATA_END for c in customers for r in c["rentals"]), \
        "rental dated after the snapshot"

    # Seasonality. Q1 total volume is materially below summer; summer and the winter
    # holidays each spike the first-rent (demand) signal. The holiday check skips the
    # current year, which has not reached November yet.
    for year in ALL_YEARS:
        monthly = [0] * 13
        first = [0] * 13
        for c in customers:
            for r in c["rentals"]:
                s = date.fromisoformat(r["start"])
                if s.year == year:
                    monthly[s.month] += 1
                    if r["seq"] == 1:
                        first[s.month] += 1
        assert sum(monthly) > 0, f"no rentals in {year}"
        assert sum(monthly[1:4]) / 3 < 0.70 * sum(monthly[6:9]) / 3, f"Q1 not materially below summer in {year}"
        fq1 = sum(first[1:4]) / 3
        assert sum(first[6:9]) / 3 > 1.25 * fq1, f"no summer first-rent spike in {year}"
        if year < CURRENT_YEAR:
            assert sum(first[11:13]) / 2 > 1.15 * fq1, f"no holiday first-rent spike in {year}"

    # The business grows year over year at a realistic rate (not flat, not a jump).
    gv = {y: sum(1 for c in customers for r in c["rentals"]
                 if date.fromisoformat(r["start"]).year == y) for y in ALL_YEARS}
    assert 1.06 <= gv[2024] / gv[2023] <= 1.30, f"2024 gross growth {gv[2024] / gv[2023]:.2f}"
    assert 1.03 <= gv[2025] / gv[2024] <= 1.22, f"2025 gross growth {gv[2025] / gv[2024]:.2f}"
    # Every displayed YoY figure is positive - the dashboard should not read as a
    # shrinking company.
    for seg in ("all", "B2C", "B2P"):
        for year in AVAILABLE_YEARS:
            k = kpis[seg][str(year)]
            assert k["yoy_first_rent"] is not None and k["yoy_first_rent"] > -0.02, \
                f"{seg} {year} first-rent YoY {k['yoy_first_rent']}"
            assert k["yoy_repeat_rent"] is not None and k["yoy_repeat_rent"] > -0.02, \
                f"{seg} {year} repeat YoY {k['yoy_repeat_rent']}"

    # Repeat conversion rate story. The yearly population repeat rate sits a little
    # above the 30% lifetime rate (repeaters recur, so they are over-represented in
    # any single year) and trends up: 2024 is visibly the lower complete year
    # because its acquisition growth was one-timer-heavy; 2026 is year-to-date.
    for year in AVAILABLE_YEARS:
        y = str(year)
        all_rate = kpis["all"][y]["repeat_conversion_rate"]
        b2c_rate = kpis["B2C"][y]["repeat_conversion_rate"]
        b2p_rate = kpis["B2P"][y]["repeat_conversion_rate"]
        assert 0.27 <= all_rate <= 0.39, f"{year} All repeat rate {all_rate:.3f}"
        assert b2p_rate < all_rate < b2c_rate, f"{year} channel order {b2p_rate:.3f}/{b2c_rate:.3f}"
    assert 0.27 <= kpis["all"]["2026"]["repeat_conversion_rate"] <= 0.34, "2026 All rate should read ~30%"
    assert 0.16 <= kpis["B2P"]["2026"]["repeat_conversion_rate"] <= 0.25, "2026 B2P rate should read ~20%"
    # The rate trends up between the two complete years - 2024 is visibly the lower.
    rate_2024 = kpis["all"]["2024"]["repeat_conversion_rate"]
    rate_2025 = kpis["all"]["2025"]["repeat_conversion_rate"]
    assert rate_2025 - rate_2024 >= 0.018, f"2024->2025 rate step too small ({rate_2024:.3f} -> {rate_2025:.3f})"
    assert rate_2024 <= 0.35, f"2024 All rate not low enough ({rate_2024:.3f})"
    assert rate_2025 <= 0.375, f"2025 All rate too far above the 30% baseline ({rate_2025:.3f})"
    # 2024 acquisition grows fast but not by a jump - keep the gross step believable.
    assert gv[2024] / gv[2023] <= 1.25, f"2024 gross jump {gv[2024] / gv[2023]:.2f} too steep"

    # All-Time view: the pooled repeat conversion rate is the lifetime rate exactly
    # (population = every customer, counted once), and below every single-year rate.
    at = {s: kpis[s]["all_time"]["repeat_conversion_rate"] for s in ("all", "B2C", "B2P")}
    assert abs(at["all"] - 0.30) < 0.003, f"all-time All rate {at['all']:.3f} != 0.30"
    assert abs(at["B2C"] - 0.40) < 0.003 and abs(at["B2P"] - 0.20) < 0.003, f"all-time channel rates {at}"
    for year in AVAILABLE_YEARS:
        assert kpis["all"][str(year)]["repeat_conversion_rate"] > at["all"], \
            f"{year} yearly rate should exceed the all-time rate"
    assert kpis["all"]["all_time"]["gross_volume"] == sum(gv.values()), "all-time gross != sum of yearly gross"

    # A retained base exists: customers active in more than one calendar year.
    multi_year = [c for c in customers if len(active_years(c)) > 1]
    assert rate(len(multi_year), len(customers)) > 0.035, \
        f"multi-year customer share {rate(len(multi_year), len(customers)):.3f}"

    # Cohort matrix has no artificial cliff for the months that have had time to
    # convert: 1-9 for the full years, 1-5 for the year-to-date 2026.
    for year in AVAILABLE_YEARS:
        last = 5 if year == CURRENT_YEAR else 9
        for month in range(1, last + 1):
            cohort = [c for c in customers if c["rentals"][0]["start"][:7] == f"{year}-{month:02d}"]
            rebooked = sum(len(c["rentals"]) > 1 for c in cohort)
            assert rate(rebooked, len(cohort)) > 0.12, \
                f"{year}-{month:02d} cohort rebook rate {rate(rebooked, len(cohort)):.3f}"

    # Cohort 12+ horizon has some signal (seasonal renters returning a year later).
    early_cohort = [c for c in customers if c["rentals"][0]["start"][:4] in ("2024", "2025")]
    far = [c for c in early_cohort
           if any((date.fromisoformat(r["start"]) - date.fromisoformat(c["rentals"][0]["start"])).days >= 330
                  for r in c["rentals"])]
    assert rate(len(far), len(early_cohort)) > 0.01, f"cohort 12+ signal {rate(len(far), len(early_cohort)):.3f}"

    # Repeat business does not vanish in winter (sustained renters keep it non-zero).
    for year in (2024, 2025):
        winter_repeat = sum(
            1 for c in customers for r in c["rentals"]
            if date.fromisoformat(r["start"]).year == year
            and date.fromisoformat(r["start"]).month in (1, 2) and r["seq"] >= 2
        )
        assert winter_repeat > 0, f"no Jan/Feb repeat rentals in {year}"

    # Gross volume can favour B2C even though B2P is acquisition-heavy.
    assert kpis["B2C"]["2026"]["gross_volume"] > kpis["B2P"]["2026"]["gross_volume"], \
        "expected B2C gross volume to lead in 2026"

    # LTV tiers: a gradient, with High the highest repeat rate.
    tier_rate = {
        t: rate(sum(c["lifetime_repeater"] for c in customers if c["ltv_tier"] == t),
                sum(c["ltv_tier"] == t for c in customers))
        for t in ("High", "Medium", "Low")
    }
    assert tier_rate["High"] > tier_rate["Medium"] > tier_rate["Low"], f"LTV tier order {tier_rate}"
    high_one_timers = sum(1 for c in customers if c["ltv_tier"] == "High" and not c["lifetime_repeater"])
    low_repeaters = sum(1 for c in customers if c["ltv_tier"] != "High" and c["lifetime_repeater"])
    assert high_one_timers > 150 and low_repeaters > 150, \
        f"LTV tiers too collinear with repeat status ({high_one_timers} / {low_repeaters})"

    # Engagement: engaged customers repeat more.
    eng = [c for c in customers if c["engaged"]]
    not_eng = [c for c in customers if not c["engaged"]]
    eng_rate = rate(sum(c["lifetime_repeater"] for c in eng), len(eng))
    not_eng_rate = rate(sum(c["lifetime_repeater"] for c in not_eng), len(not_eng))
    assert eng_rate > not_eng_rate + 0.05, f"engagement story weak: {eng_rate:.3f} vs {not_eng_rate:.3f}"

    # Time-to-next clusters both present.
    gaps = []
    for c in customers:
        rs = c["rentals"]
        gaps += [(date.fromisoformat(b["start"]) - date.fromisoformat(a["start"])).days
                 for a, b in zip(rs, rs[1:])]
    assert sum(60 <= g <= 90 for g in gaps) > 100, "frequent cluster too small"
    assert sum(330 <= g <= 365 for g in gaps) > 100, "seasonal cluster too small"


# --------------------------------------------------------------------------- main


def definitions() -> dict:
    return {
        "population": "Unique customers with at least one rental whose start date falls in the selected year.",
        "gross_volume": "Count of closed rental contracts with a start date in the selected year. Contracts, not unique customers.",
        "first_time_vs_repeat": "Gross Volume split by rental sequence. 1st Rent = the customer's first-ever rental; 2+ Rents = their 2nd or later rental. The two parts sum to Gross Volume.",
        "core_repeat_conversion_rate": "Unique customers in the population who are lifetime repeaters, divided by all unique customers in the population. Lifetime repeater = 2 or more rentals anywhere in the dataset, even if only one falls in the selected year.",
        "mom": "Latest closed month of the selected year vs the month before, shown separately for 1st Rent and 2+ Rents volume.",
        "yoy": "Selected year vs the previous year over the same span - full year for 2024-2025, year-to-date (January-August) for 2026 - shown separately for 1st Rent and 2+ Rents volume.",
        "ltv_tier": "High / Medium / Low by tercile of total customer spend across the dataset.",
        "engagement": "Whether the customer engaged with a post-rental retention campaign (Email, Push, or SMS) versus none.",
    }


def assumptions() -> dict:
    return {
        "lifetime_one_time_rate": 0.70,
        "channel_split": "50/50 B2C / B2P by unique customer headcount.",
        "b2p_one_time_rate": 0.80,
        "b2c_one_time_rate": 0.60,
        "one_timer_channel_mix": "About 57% B2P / 43% B2C among one-timers; B2P is acquisition-heavy.",
        "repeater_types": "Repeaters are frequent (next rental 60-90 days later) or seasonal (about a year later, one summer trip). Most frequent repeaters do their whole burst inside one calendar year; roughly 4% of all customers rent across more than one calendar year, and B2P repeaters almost never do.",
        "current_period": "2024 and 2025 are complete calendar years. 2026 is year-to-date through 31 August 2026 (the last closed month); its Gross Volume, trends and cohorts cover January-August only, and its YoY compares against January-August 2025.",
        "all_time_view": "The period control has an All Time option that pools every rental in the dataset (2023-2026). Its Core Repeat Conversion Rate equals the 30% lifetime rate exactly, because the population is every customer counted once. Single-year views read a few points higher only because a repeat customer appears in every year they rent. All Time has no Year-over-Year or Month-over-Month figure.",
        "quarterly_view": "The headline contract chart can be switched between Monthly and Quarterly (Q1-Q4). This is a volume and seasonality view. The Repeat Conversion Rate is deliberately never sliced by quarter: a quarter is a small, seasonally-skewed slice of customers, and a repeat customer's rentals fall across several quarters, so a quarterly repeat rate reflects window length and season, not retention.",
        "yearly_vs_lifetime_rate": "The yearly Repeat Conversion Rate sits a little above the 30% lifetime rate because a repeat customer appears in every year they rent, so repeaters are slightly over-represented in any single year. It trends up across the complete years - 2024 reads lower (about 35%) because that year's fast acquisition growth was one-timer-heavy, which diluted the rate; 2025 reads higher (about 37%) as more of the intake converted. 2026, being year-to-date, reads near 33%.",
        "cohort_recency": "In the Cohort view, first-rental cohorts from October onward (and June onward for the 2026 year-to-date) carry few repeaters: those customers were acquired off-peak and have had little time to rebook. Read the earlier-month rows for the real conversion signal.",
        "growth": "Acquisition grows every year - fastest into 2024 (a one-timer-heavy intake), then steadier - so Gross Volume and every displayed Year-over-Year figure are positive. Month-to-month figures still move with the season: repeat-rental volume peaks in early autumn as summer renters return.",
        "baseline_year": "2023 is a full year used as the YoY baseline for 2024 and folded into All Time; the period control offers 2024, 2025, 2026 and All Time.",
        "ltv_repeat_relationship": "Each customer carries a lognormal price level applied to every rental, so LTV is not just a rental count. The High LTV tercile still carries the highest lifetime repeat rate.",
        "engagement_repeat_relationship": "Campaign engagement is more common for B2C, and engaged customers were planted with a higher lifetime repeat rate than non-engaged.",
        "gross_volume_vs_repeat_rate": "Gross Volume counts contracts; the Repeat Conversion Rate counts unique customers. B2C can lead on Gross Volume because repeaters add extra contracts.",
    }


def main() -> None:
    rng = random.Random(SEED)
    customers = build_customers(rng)
    kpis = build_kpi_block(customers)
    check(customers, kpis)

    payload = {
        "meta": {
            "as_of": AS_OF,
            "available_years": AVAILABLE_YEARS,
            "baseline_year": BASELINE_YEAR,
            "currency": "USD",
            "generated_customers": len(customers),
            "definitions": definitions(),
            "assumptions": assumptions(),
        },
        "kpis": kpis,
        "customers": customers,
    }

    text = json.dumps(payload, separators=(",", ":"))
    targets = [
        Path(__file__).parent / "output" / "crm.json",
        Path(__file__).parent.parent / "app" / "public" / "data" / "crm.json",
    ]
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        print(f"wrote {target} ({target.stat().st_size / 1_000_000:.2f} MB)")

    report(customers, kpis)


def report(customers: list[dict], kpis: dict) -> None:
    n_rentals = sum(len(c["rentals"]) for c in customers)
    repeaters = [c for c in customers if c["lifetime_repeater"]]
    multi_year = [c for c in customers if len(active_years(c)) > 1]
    print("\n--- summary ---")
    print(f"customers: {len(customers)}  rentals: {n_rentals}  ({n_rentals / len(customers):.2f}/customer)")
    print(f"lifetime repeaters: {len(repeaters)} ({len(repeaters) / len(customers):.1%})")
    by_type = {t: sum(c["repeater_type"] == t for c in customers) for t in ("frequent", "seasonal")}
    print(f"repeater types: {by_type}   multi-year customers: {len(multi_year)} "
          f"({len(multi_year) / len(customers):.1%})")
    for tier in ("High", "Medium", "Low"):
        tt = [c for c in customers if c["ltv_tier"] == tier]
        rep = sum(c["lifetime_repeater"] for c in tt)
        med = statistics.median(c["ltv"] for c in tt)
        print(f"  LTV {tier:<6} n={len(tt):<5} repeat {rep / len(tt):.0%}   median LTV ${med:,.0f}")
    for year in ALL_YEARS:
        gv = sum(1 for c in customers for r in c["rentals"]
                 if date.fromisoformat(r["start"]).year == year)
        print(f"  {year} gross volume: {gv}")
    for segment in ("all", "B2C", "B2P"):
        row = "   ".join(
            f"{year}: GV {kpis[segment][str(year)]['gross_volume']:>5} "
            f"rate {kpis[segment][str(year)]['repeat_conversion_rate']:.1%}"
            for year in AVAILABLE_YEARS
        )
        print(f"  {segment:>4}  {row}")


if __name__ == "__main__":
    main()

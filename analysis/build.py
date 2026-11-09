"""Value + Quality vs the market, built only from open data.

Inputs (analysis/data):
  us.csv, dev.csv     monthly % returns from the Kenneth R. French Data Library
                      (Mkt-RF, RF, and the "BIG HiBM" / "BIG HiOP" portfolios of the
                      2x3 sorts on size and book-to-market / operating profitability);
                      US 1963-07..1990-06, Developed 1990-07..latest
  eur_per_usd.csv     month-end EUR per USD (FRED series DEXUSEU, inverted)
Output: analysis/out.json, then export.py writes src/data/charts.json.

Run:  python3 analysis/build.py && python3 analysis/export.py
"""
import csv, json, math, os
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA, OUT = os.path.join(HERE, "data"), os.path.join(HERE, "out.json")


# ----------------------------------------------------------------- helpers
def ym_next(ym):
    y, m = divmod(ym, 100)
    return (y + 1) * 100 + 1 if m == 12 else ym + 1


def ym_range(a, b):
    out = []
    while a <= b:
        out.append(a)
        a = ym_next(a)
    return out


def months_between(a, b):
    return (b // 100 - a // 100) * 12 + (b % 100 - a % 100)


# ----------------------------------------------------------------- portfolios
def build(ret_by_ym, yms, rebalance="annual"):
    """Levels (start 100) for market, 50/50, value, quality."""
    lv = {"mkt": [100.0], "mix": [100.0], "val": [100.0], "qual": [100.0]}
    a = b = 50.0
    for ym in yms:
        m, v, q = ret_by_ym[ym]
        lv["mkt"].append(lv["mkt"][-1] * (1 + m))
        lv["val"].append(lv["val"][-1] * (1 + v))
        lv["qual"].append(lv["qual"][-1] * (1 + q))
        a, b = a * (1 + v), b * (1 + q)
        lv["mix"].append(a + b)
        if rebalance == "monthly" or (rebalance == "annual" and ym % 100 == 12):
            a = b = (a + b) / 2
    return lv


# ----------------------------------------------------------------- drawdowns
def ath_stats(lv):
    """Max drawdown and longest spell below a previous high (all-time-high basis)."""
    peak, peak_i, maxdd, maxdd_i, maxdd_peak = lv[0], 0, 0.0, 0, 0
    longest, longest_span, cur_start = 0, (0, 0), None
    for i, v in enumerate(lv):
        if v >= peak:
            if cur_start is not None and i - cur_start > longest:
                longest, longest_span = i - cur_start, (cur_start, i)
            peak, peak_i, cur_start = v, i, None
        else:
            if cur_start is None:
                cur_start = peak_i
            dd = v / peak - 1
            if dd < maxdd:
                maxdd, maxdd_i, maxdd_peak = dd, i, peak_i
    open_span = None
    if cur_start is not None:
        open_span = (cur_start, len(lv) - 1)
        if len(lv) - 1 - cur_start > longest:
            longest, longest_span = len(lv) - 1 - cur_start, (cur_start, None)
    return {"maxdd": maxdd, "maxdd_peak": maxdd_peak, "maxdd_trough": maxdd_i,
            "longest": longest, "longest_span": longest_span, "open": open_span}


def underwater(lv):
    out, peak = [], lv[0]
    for v in lv:
        peak = max(peak, v)
        out.append(v / peak - 1)
    return out


def bear_windows(lv, decline, rebound):
    """Market crisis windows: a fall of at least `decline` from a local high.
    The low is confirmed once the level has risen `rebound` from it, after
    which a new local high is tracked."""
    eps, peak_i, in_bear, trough_i = [], 0, False, None
    for i, v in enumerate(lv):
        if not in_bear:
            if v >= lv[peak_i]:
                peak_i = i
            elif v <= lv[peak_i] * (1 - decline):
                in_bear, trough_i = True, i
        else:
            if v < lv[trough_i]:
                trough_i = i
            elif v >= lv[trough_i] * (1 + rebound) or v >= lv[peak_i]:
                eps.append([peak_i, trough_i])
                in_bear = False
                # restart local-high tracking from the trough onwards
                peak_i = max(range(trough_i, i + 1), key=lambda j: (lv[j], j))
    if in_bear:
        eps.append([peak_i, trough_i])
    return eps


def first_at_or_above(lv, start, level):
    for i in range(start, len(lv)):
        if lv[i] >= level:
            return i
    return None


def measure(lv, lo, hi_peak, hi_trough):
    """Local peak in [lo, hi_peak], lowest point after it up to hi_trough,
    and the first month back at the peak level."""
    lo = max(lo, 0)
    p = max(range(lo, hi_peak + 1), key=lambda i: (lv[i], i))
    t = min(range(p, hi_trough + 1), key=lambda i: (lv[i], -i))
    r = first_at_or_above(lv, t + 1, lv[p]) if t > p else p
    return {"p": p, "t": t, "r": r, "depth": lv[t] / lv[p] - 1}


def crisis_table(lv, decline=0.15, rebound=0.20, lookback=12):
    wins = bear_windows(lv["mkt"], decline, rebound)
    rows, n = [], len(lv["mkt"])
    for k, (P, T) in enumerate(wins):
        nextP = wins[k + 1][0] if k + 1 < len(wins) else n - 1
        R = first_at_or_above(lv["mkt"], T + 1, lv["mkt"][P])
        end = min(R if R is not None else n - 1, nextP)
        end = max(end, T)
        prevT = wins[k - 1][1] if k > 0 else 0
        row = {"mkt": {"p": P, "t": T, "r": R, "depth": lv["mkt"][T] / lv["mkt"][P] - 1}}
        for key in ("mix", "val", "qual"):
            row[key] = measure(lv[key], max(P - lookback, prevT), T, end)
        rows.append(row)
    return rows


def summary(lv, i0, i1):
    out = {}
    yrs = (i1 - i0) / 12.0
    for key in ("mkt", "mix", "val", "qual"):
        seg = lv[key][i0:i1 + 1]
        rets = [seg[i] / seg[i - 1] - 1 for i in range(1, len(seg))]
        mu = sum(rets) / len(rets)
        sd = math.sqrt(sum((x - mu) ** 2 for x in rets) / (len(rets) - 1))
        st = ath_stats(seg)
        worst12 = min(seg[i] / seg[i - 12] - 1 for i in range(12, len(seg))) if len(seg) > 12 else None
        out[key] = {"cagr": (seg[-1] / seg[0]) ** (1 / yrs) - 1, "vol": sd * math.sqrt(12),
                    "maxdd": st["maxdd"], "maxdd_peak": st["maxdd_peak"] + i0, "maxdd_trough": st["maxdd_trough"] + i0,
                    "longest": st["longest"],
                    "longest_from": st["longest_span"][0] + i0,
                    "longest_to": (st["longest_span"][1] + i0) if st["longest_span"][1] is not None else None,
                    "worst12": worst12, "growth": seg[-1] / seg[0]}
    return out


def pack(name, rets, yms, note):
    lv = build(rets, yms)
    dates = [yms[0] - 1 if yms[0] % 100 != 1 else (yms[0] // 100 - 1) * 100 + 12] + list(yms)
    rel = [a / b * 100 for a, b in zip(lv["mix"], lv["mkt"])]
    rs = ath_stats(rel)
    roll = []
    for i in range(120, len(dates)):
        a = (lv["mix"][i] / lv["mix"][i - 120]) ** 0.1 - 1
        b = (lv["mkt"][i] / lv["mkt"][i - 120]) ** 0.1 - 1
        roll.append(a - b)
    rolling = None
    if roll:
        rolling = {"n": len(roll), "share_mix_ahead": sum(1 for x in roll if x > 0) / len(roll),
                   "worst": min(roll), "best": max(roll), "worst_end": 120 + roll.index(min(roll)),
                   "series": roll}
    return {"name": name, "note": note, "dates": dates, "lv": lv,
            "uw": {k: underwater(v) for k, v in lv.items()},
            "rel": rel,
            "rel_stats": {"maxdd": rs["maxdd"], "peak": rs["maxdd_peak"], "trough": rs["maxdd_trough"],
                          "recovered": first_at_or_above(rel, rs["maxdd_trough"] + 1, rel[rs["maxdd_peak"]]),
                          "longest": rs["longest"], "longest_from": rs["longest_span"][0], "longest_to": rs["longest_span"][1]},
            "rolling10": rolling,
            "crises": {str(int(d * 100)): crisis_table(lv, decline=d) for d in (0.10, 0.15, 0.20)},
            "summary": summary(lv, 0, len(dates) - 1)}




# ----------------------------------------------------------------- load
def load(path):
    out = OrderedDict()
    with open(path) as fh:
        for r in csv.DictReader(fh):
            out[int(r["ym"])] = ((float(r["mkt_rf"]) + float(r["rf"])) / 100, float(r["big_hibm"]) / 100, float(r["big_hiop"]) / 100)
    return out


US, DEV = load(f"{DATA}/us.csv"), load(f"{DATA}/dev.csv")
LAST = max(DEV)
SPLIT = 199006                       # last US month; developed markets from 1990-07
assert max(US) == SPLIT and min(DEV) == 199007

sp = {ym: (US[ym] if ym <= SPLIT else DEV[ym]) for ym in ym_range(197001, LAST)}
yms_main = ym_range(197001, LAST)
main = pack("usd", sp, yms_main, "US 1970-01..1990-06, Developed 1990-07..")

# ----------------------------------------------------------------- EUR view (from 1999)
fx_me = OrderedDict()
with open(f"{DATA}/eur_per_usd.csv") as fh:
    for r in csv.DictReader(fh):
        fx_me[int(r["ym"])] = float(r["eur_per_usd"])
eur_yms = ym_range(199902, LAST)
eur_rets = {}
for ym in eur_yms:
    prev = ym - 1 if ym % 100 != 1 else (ym // 100 - 1) * 100 + 12
    g = fx_me[ym] / fx_me[prev]
    eur_rets[ym] = tuple((1 + x) * g - 1 for x in DEV[ym])
ds_eur = pack("eur", eur_rets, eur_yms, "Developed, converted to EUR")

# ----------------------------------------------------------------- sub-periods
idx = {ym: i for i, ym in enumerate(main["dates"])}
subs = {
    "full": summary(main["lv"], 0, len(main["dates"]) - 1),
    "us": summary(main["lv"], 0, idx[199006]),
    "dev_pre": summary(main["lv"], idx[199006], idx[201410]),
    "etf_era": summary(main["lv"], idx[201410], len(main["dates"]) - 1),
    "since99": summary(main["lv"], idx[199812], len(main["dates"]) - 1),
}

# the 1968-70 bear market measured from its real peak (US data starts 1963-07)
us_long_yms = ym_range(min(US), SPLIT)
us_long = build(US, us_long_yms)
ld = [min(US) - 1] + us_long_yms
i70 = ld.index(197006)
pre70 = {}
for key in ("mkt", "mix"):
    seg = us_long[key][: i70 + 1]
    pk = max(range(len(seg)), key=lambda i: (seg[i], i))
    pre70[key] = {"peak": ld[pk], "depth": seg[i70] / seg[pk] - 1}

# rebalancing sensitivity
sens = {}
for mode in ("annual", "monthly", "never"):
    lv = build(sp, yms_main, rebalance=mode)["mix"]
    sens[mode] = {"cagr": (lv[-1] / 100) ** (12 / len(yms_main)) - 1, "maxdd": ath_stats(lv)["maxdd"]}

# ----------------------------------------------------------------- calendar years
def calendar(ds):
    d, out = ds["dates"], []
    ends = [i for i, ym in enumerate(d) if ym % 100 == 12]
    if ends[0] != 0: ends = [0] + ends
    if ends[-1] != len(d) - 1: ends.append(len(d) - 1)
    for a, b in zip(ends, ends[1:]):
        rm = ds["lv"]["mkt"][b] / ds["lv"]["mkt"][a] - 1; rx = ds["lv"]["mix"][b] / ds["lv"]["mix"][a] - 1
        out.append({"y": d[b] // 100, "a": a, "b": b, "rm": rm, "rx": rx, "d": rx - rm,
                    "rv": ds["lv"]["val"][b] / ds["lv"]["val"][a] - 1, "rq": ds["lv"]["qual"][b] / ds["lv"]["qual"][a] - 1,
                    "partial": b - a < 12})
    return out


def year_stats(ds):
    yrs = calendar(ds); neg = [y for y in yrs if y["d"] < 0]; pos = [y for y in yrs if y["d"] >= 0]
    best = cur = 0; st = 0; span = (0, 0)
    for i, y in enumerate(yrs):
        if y["d"] < 0:
            if cur == 0: st = i
            cur += 1
            if cur > best: best, span = cur, (st, i)
        else:
            cur = 0
    a0, z0 = yrs[span[0]], yrs[span[1]]
    cum = (ds["lv"]["mix"][z0["b"]] / ds["lv"]["mix"][a0["a"]]) / (ds["lv"]["mkt"][z0["b"]] / ds["lv"]["mkt"][a0["a"]]) - 1
    worst = sorted(yrs, key=lambda y: y["d"])[:4]
    return {"n": len(yrs), "behind": len(neg), "avg_behind": sum(y["d"] for y in neg) / len(neg), "avg_ahead": sum(y["d"] for y in pos) / len(pos),
            "worst": [(y["y"], y["d"], y["rx"], y["rm"]) for y in worst], "streak": best, "streak_span": (a0["y"], z0["y"]), "streak_cum": cum,
            "last_years": [(y["y"], round(y["d"] * 100, 1)) for y in yrs[-12:]]}


# ----------------------------------------------------------------- reality check: fund-published calendar-year returns (USD, NAV, %)
FUNDS = {  # source: iShares product pages, read 9 Nov 2026
    "IS3S": {2016: 8.1, 2017: 22.2, 2018: -13.9, 2019: 19.1, 2020: -3.9, 2021: 20.0, 2022: -10.0, 2023: 19.4, 2024: 5.3, 2025: 39.6},
    "IS3Q": {2016: 5.0, 2017: 23.1, 2018: -7.3, 2019: 30.5, 2020: 14.9, 2021: 23.2, 2022: -19.2, 2023: 25.7, 2024: 16.6, 2025: 15.4},
    "ACWI": {2016: 7.8, 2017: 23.9, 2018: -9.5, 2019: 26.4, 2020: 15.6, 2021: 18.7, 2022: -18.2, 2023: 22.3, 2024: 17.4, 2025: 22.4},
}
cal = {y["y"]: y for y in calendar(main)}
funds = []
gx = gm = ax = am = 1.0
for y in range(2016, 2026):
    fx_ = (FUNDS["IS3S"][y] + FUNDS["IS3Q"][y]) / 2 / 100          # 50/50 rebalanced each January
    fm_ = FUNDS["ACWI"][y] / 100
    c = cal[y]
    gx *= 1 + fx_; gm *= 1 + fm_; ax *= 1 + c["rx"]; am *= 1 + c["rm"]
    funds.append({"y": y, "is3s": FUNDS["IS3S"][y], "is3q": FUNDS["IS3Q"][y], "mix": fx_ * 100, "mkt": fm_ * 100, "d": (fx_ - fm_) * 100,
                  "a_val": c["rv"] * 100, "a_qual": c["rq"] * 100, "a_mix": c["rx"] * 100, "a_mkt": c["rm"] * 100, "a_d": c["d"] * 100})
fund_sum = {"cagr_mix": gx ** 0.1 - 1, "cagr_mkt": gm ** 0.1 - 1, "cagr_a_mix": ax ** 0.1 - 1, "cagr_a_mkt": am ** 0.1 - 1,
            "behind": sum(1 for f in funds if f["d"] < 0), "a_behind": sum(1 for f in funds if f["a_d"] < 0),
            "same_sign": sum(1 for f in funds if (f["d"] < 0) == (f["a_d"] < 0)),
            "cum_gap": gx / gm - 1, "a_cum_gap": ax / am - 1,
            "streak_2016_2020": math.prod(1 + f["mix"] / 100 for f in funds[:5]) / math.prod(1 + f["mkt"] / 100 for f in funds[:5]) - 1}

out = {"main": main, "eur": ds_eur, "subs": subs, "pre70": pre70, "sens": sens, "last": LAST,
       "years": {"usd": year_stats(main), "eur": year_stats(ds_eur)}, "funds": funds, "fund_sum": fund_sum}
json.dump(out, open(OUT, "w"))
print("written", OUT, "last month", LAST)

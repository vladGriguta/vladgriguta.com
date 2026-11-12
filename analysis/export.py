"""Shape analysis/out.json into the compact data the site's charts and tables read
(src/data/charts.json, funds.json, risk.json) and print the figures quoted in the article."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
o = json.load(open(os.path.join(HERE, "out.json")))
DEST = os.path.join(HERE, "..", "src", "data")

NAMES = [  # (first trough month, last trough month, Romanian name, short label)
    (196901, 197012, "Recesiunea din 1969-70", "1970"),
    (197301, 197412, "Șocul petrolier, 1973-74", "1973-74"),
    (197501, 197512, "Corecția din 1975", "1975"),
    (197801, 197812, "Corecția din 1978", "1978"),
    (198001, 198006, "Corecția din 1980", "1980"),
    (198101, 198212, "Recesiunea din 1980-82", "1980-82"),
    (198301, 198412, "Corecția din 1983-84", "1983-84"),
    (198701, 198812, "Crahul din octombrie 1987", "1987"),
    (199001, 199112, "Războiul din Golf, 1990", "1990"),
    (199801, 199812, "Criza rusă și LTCM, 1998", "1998"),
    (200101, 200312, "Bula dot-com, 2000-03", "2000-03"),
    (200801, 200912, "Criza financiară, 2007-09", "2007-09"),
    (201001, 201012, "Criza datoriilor suverane, 2010", "2010"),
    (201101, 201212, "Criza zonei euro, 2011", "2011"),
    (201501, 201612, "China și petrolul, 2015-16", "2015-16"),
    (201801, 201912, "Corecția din 2018", "2018"),
    (202001, 202012, "Pandemia COVID-19, 2020", "2020"),
    (202201, 202312, "Inflație și dobânzi, 2022", "2022"),
    (202501, 202512, "Tarifele comerciale, 2025", "2025"),
]


def name_of(ym):
    for a, b, n, sh in NAMES:
        if a <= ym <= b:
            return n, sh
    raise SystemExit(f"no crisis name for trough {ym}; add one to NAMES")


def rows(ds, th, spliced):
    D = o[ds]; d = D["dates"]; out = []
    for r in D["crises"][th]:
        t = d[r["mkt"]["t"]]
        nm, sh = name_of(t)
        row = {"name": nm, "short": sh, "src": ("us" if t <= 199006 else "dev") if spliced else "dev"}
        for k in ("mkt", "mix"):
            c = r[k]
            row[k] = {"p": c["p"], "t": c["t"], "r": c["r"], "d": round(c["depth"], 5)}
        out.append(row)
    return out


RISK = o["risk"]
CUR = {"main": "usd", "eur": "eur"}


def spell(s):
    return [s["p"], s["t"], s["r"], round(s["depth"], 5)]


def long_spells(ds, min_months=12):
    """Underwater spells of at least a year, for the chart of time below a previous high."""
    w = RISK["windows"]["usd_full" if ds == "main" else "eur_1999"]
    return {k: [spell(s) for s in w[k]["spells"] if s["months"] >= min_months] for k in ("mkt", "mix")}


def episodes(ds, th):
    """Recoveries after market falls of at least th% from an all-time high. An episode is
    named after every 20% crisis whose low falls inside it, or after its own low."""
    D, E = o[ds], RISK["episodes"][CUR[ds]][th]
    d, out = D["dates"], []
    for r in E["rows"]:
        P, T, R = r["mkt"]["p"], r["mkt"]["t"], r["mkt"]["r"]
        end = len(d) - 1 if R is None else R
        inside = [c["mkt"]["t"] for c in D["crises"]["20"] if P < c["mkt"]["t"] <= end]
        named = [name_of(d[t]) for t in (inside or [T])]
        mixes = ([r["mix"]] if r["mix"] else []) + r["also"]
        out.append({"names": [n for n, _ in named], "shorts": [sh for _, sh in named], "first": r["first"],
                    "mkt": spell(r["mkt"]), "mix": [spell(m) for m in sorted(mixes, key=lambda m: m["p"])]})
    return {"rows": out, "tally": E["tally"]}


def pack(ds, spliced):
    D = o[ds]
    return {"start": D["dates"][0], "n": len(D["dates"]),
            "mkt": [round(x, 3) for x in D["lv"]["mkt"]], "mix": [round(x, 3) for x in D["lv"]["mix"]],
            "crises": {th: rows(ds, th, spliced) for th in ("10", "15", "20")},
            "spells": long_spells(ds), "rec": {th: episodes(ds, th) for th in ("10", "15", "20")}}


page = {"usd": pack("main", True), "eur": pack("eur", False)}
page["usd"]["seg"] = [[196912, 199006, "us"], [199006, o["last"], "dev"]]
page["eur"]["seg"] = [[199901, o["last"], "dev"]]
json.dump(page, open(os.path.join(DEST, "charts.json"), "w"), ensure_ascii=False, separators=(",", ":"))

funds = {"rows": [{k: round(v, 1) if isinstance(v, float) else v for k, v in f.items()} for f in o["funds"]],
         "sum": {k: round(v, 4) if isinstance(v, float) else v for k, v in o["fund_sum"].items()}}
json.dump(funds, open(os.path.join(DEST, "funds.json"), "w"), ensure_ascii=False, indent=1)

# ----------------------------------------------------------------- depth vs duration table
def side(st, d):
    L, O = st["longest"], st["open"]
    return {"below": st["below"], "share": round(st["share"], 4), "ulcer": round(st["ulcer"], 2), "maxdd": round(st["maxdd"], 5),
            "longest": {"from": d[L["p"]], "to": d[L["r"]], "months": L["months"]},
            "open": {"from": d[O["p"]], "months": O["months"]} if O else None}


def window(key):
    w = RISK["windows"][key]
    d = o["main" if w["cur"] == "usd" else "eur"]["dates"]
    return {"key": key, "cur": w["cur"], "from": w["from"], "to": w["to"], "months": w["mkt"]["months"],
            "mkt": side(w["mkt"], d), "mix": side(w["mix"], d)}


risk = {"windows": [window(k) for k in ("usd_full", "usd_1999", "eur_1999")]}
json.dump(risk, open(os.path.join(DEST, "risk.json"), "w"), ensure_ascii=False, indent=1)

print("charts.json bytes", os.path.getsize(os.path.join(DEST, "charts.json")))
for cur in ("usd", "eur"):
    for th in ("10", "15", "20"):
        print(cur, th, [r["short"] for r in page[cur]["crises"][th]])
print("\nFigures quoted in the article")
for key in RISK["windows"]:
    w = window(key)
    print(f'  {key:11} {w["from"]}..{w["to"]}, {w["months"]} months')
    for k in ("mkt", "mix"):
        x = w[k]; L, O = x["longest"], x["open"]
        print(f'    {k}  below a high {x["below"]:3d} = {x["share"] * 100:4.1f}%   ulcer {x["ulcer"]:5.2f}   maxdd {x["maxdd"] * 100:5.1f}%'
              f'   longest {L["months"]:3d} ({L["from"]}..{L["to"]})' + (f'   open since {O["from"]}' if O else ""))
f = RISK["same_return"]
print(f'  usd_full, 50/50 at the market\'s return: below a high {f["share"] * 100:.1f}%, ulcer {f["ulcer"]:.2f}')
c = RISK["eur_case"]; b = c.get("between")
print(f'  eur, inside the market\'s {c["months"]}-month spell: below a high {c["below"]["mkt"]} (mkt) and {c["below"]["mix"]} (mix) months; '
      f'50/50 spells of {[s["months"] for s in c["mix_spells"]]} months'
      + (f'; in {b["ym"]} mix {b["mix_vs_first_high"] * 100:+.1f}% vs its first high, mkt {b["mkt_vs_high"] * 100:+.1f}% vs its high' if b else ""))
for cur in ("usd", "eur"):
    d = o["main" if cur == "usd" else "eur"]["dates"]
    f = lambda s: f"{d[s[0]]}>{d[s[1]]}>{d[s[2]] if s[2] is not None else 'open'} {(len(d) - 1 if s[2] is None else s[2]) - s[0]:3d}m {s[3] * 100:5.1f}%"
    for th in ("10", "15", "20"):
        e = page[cur]["rec"][th]
        print(f"  {cur}, market falls of {th}%+ from an all-time high: {len(e['rows'])} episodes, first back {e['tally']}")
    for r in page[cur]["rec"]["10"]["rows"]:
        print(f"    {'+'.join(r['shorts']):16} mkt {f(r['mkt'])}   mix " + " | ".join(f(x) for x in r["mix"]) + f"   first: {r['first']}")

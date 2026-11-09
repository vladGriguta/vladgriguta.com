"""Shape analysis/out.json into the compact data the site's charts read."""
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


def pack(ds, spliced):
    D = o[ds]
    return {"start": D["dates"][0], "n": len(D["dates"]),
            "mkt": [round(x, 3) for x in D["lv"]["mkt"]], "mix": [round(x, 3) for x in D["lv"]["mix"]],
            "crises": {th: rows(ds, th, spliced) for th in ("10", "15", "20")}}


page = {"usd": pack("main", True), "eur": pack("eur", False)}
page["usd"]["seg"] = [[196912, 199006, "us"], [199006, o["last"], "dev"]]
page["eur"]["seg"] = [[199901, o["last"], "dev"]]
json.dump(page, open(os.path.join(DEST, "charts.json"), "w"), ensure_ascii=False, separators=(",", ":"))

funds = {"rows": [{k: round(v, 1) if isinstance(v, float) else v for k, v in f.items()} for f in o["funds"]],
         "sum": {k: round(v, 4) if isinstance(v, float) else v for k, v in o["fund_sum"].items()}}
json.dump(funds, open(os.path.join(DEST, "funds.json"), "w"), ensure_ascii=False, indent=1)
print("charts.json bytes", os.path.getsize(os.path.join(DEST, "charts.json")))
for cur in ("usd", "eur"):
    for th in ("10", "15", "20"):
        print(cur, th, [r["short"] for r in page[cur]["crises"][th]])

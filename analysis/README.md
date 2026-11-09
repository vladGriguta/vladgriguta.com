# Analiza din spatele articolului „VWCE sau Value + Quality?”

```bash
python3 analysis/build.py && python3 analysis/export.py
```

`build.py` construiește cele două portofolii și calculează crizele; `export.py` scrie `src/data/charts.json` și `src/data/funds.json`, pe care le citesc graficele.

## Date

| Fișier | Sursă |
|---|---|
| `data/us.csv`, `data/dev.csv` | [Kenneth R. French Data Library](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html), ediția septembrie 2026. Randamente lunare în %: `Mkt-RF`, `RF`, portofoliul `BIG HiBM` (sortare 2x3 pe mărime și B/M) și `BIG HiOP` (sortare 2x3 pe mărime și profitabilitate operațională). SUA 1963-07 - 1990-06, piețe dezvoltate 1990-07 - 2026-09. © Eugene F. Fama și Kenneth R. French. |
| `data/eur_per_usd.csv` | [FRED, seria DEXUSEU](https://fred.stlouisfed.org/series/DEXUSEU), ultima observație din fiecare lună, inversată în EUR per USD. |
| randamentele fondurilor (în `build.py`) | Randamente pe an calendaristic publicate de iShares pe paginile fondurilor IS3S, IS3Q și iShares MSCI ACWI, citite pe 9 noiembrie 2026. |

Pentru actualizare: descarcă din nou fișierele CSV de pe pagina French, extrage coloanele de mai sus și rulează cele două scripturi.

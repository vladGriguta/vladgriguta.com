# Analiza din spatele articolului „VWCE sau Value + Quality?”

```bash
python3 analysis/build.py && python3 analysis/export.py
```

`build.py` construiește cele două portofolii și calculează crizele, lunile sub maxim, revenirile și Ulcer Index; `export.py` scrie `src/data/charts.json`, `src/data/funds.json` și `src/data/risk.json`, pe care le citesc graficele și tabelele, și afișează cifrele citate în articol.

## Adâncime și durată

Calculele sunt într-o singură secțiune din `build.py` („depth vs duration of losses”), pe valori de sfârșit de lună și pe maxime numărate de la începutul fiecărei ferestre:

- **Luni sub maxim**: lunile în care valoarea este sub cea mai mare valoare de până atunci, împărțite la lunile ferestrei.
- **Revenire**: luni de la luna unui maxim până la prima lună cu valoare cel puțin egală. O perioadă nerecuperată la sfârșitul datelor este raportată separat (`open`) și nu intră la cea mai lungă revenire.
- **Ulcer Index**: rădăcina pătrată a mediei pătratelor scăderilor față de maxim, în procente.
- **Episoade** (`recovery_episodes`): perioadele în care piața a stat sub maximul ei istoric și a scăzut cu cel puțin 10, 15 sau 20%. Pentru 50/50 se ia perioada lui sub maxim care conține luna minimului pieței și se compară luna calendaristică a revenirii.
- **Același randament** (`same_return`): 50/50 cu un cost lunar constant care îl aduce în același punct final cu piața, ca să se vadă cât din avantajul la reveniri vine doar din randamentul mai mare.

Ferestrele: USD din decembrie 1969, EUR din ianuarie 1999 și, pentru comparație directă cu EUR, USD tot din ianuarie 1999.

## Date

| Fișier | Sursă |
|---|---|
| `data/us.csv`, `data/dev.csv` | [Kenneth R. French Data Library](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html), ediția septembrie 2026. Randamente lunare în %: `Mkt-RF`, `RF`, portofoliul `BIG HiBM` (sortare 2x3 pe mărime și B/M) și `BIG HiOP` (sortare 2x3 pe mărime și profitabilitate operațională). SUA 1963-07 - 1990-06, piețe dezvoltate 1990-07 - 2026-09. © Eugene F. Fama și Kenneth R. French. |
| `data/eur_per_usd.csv` | [FRED, seria DEXUSEU](https://fred.stlouisfed.org/series/DEXUSEU), ultima observație din fiecare lună, inversată în EUR per USD. |
| randamentele fondurilor (în `build.py`) | Randamente pe an calendaristic publicate de iShares pe paginile fondurilor IS3S, IS3Q și iShares MSCI ACWI, citite pe 9 noiembrie 2026. |

Pentru actualizare: descarcă din nou fișierele CSV de pe pagina French, extrage coloanele de mai sus și rulează cele două scripturi.

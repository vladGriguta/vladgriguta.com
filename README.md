# vladgriguta.com

Site personal construit cu Astro, găzduit pe Cloudflare Workers (static assets). Fiecare commit pe `main` publică automat.

## Lucru local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # generează ./dist
```

## Structură

- `src/content/posts/ro|en/*.mdx`: articolele, câte un fișier pe limbă, cu același nume
- `src/components/charts/`: componentele de grafice folosite în articole
- `src/scripts/charts.js` și `src/data/*.json`: logica și datele graficelor
- `analysis/`: scripturile și datele deschise din care se generează `src/data` (vezi `analysis/README.md`)
- `src/layouts/Base.astro`, `src/styles/global.css`: layout și stil
- `wrangler.jsonc`: configurația Cloudflare (servește `./dist`, domeniile proprii)

## Articol nou

**Din editorul vizual:** intră pe [app.pagescms.org](https://app.pagescms.org), loghează-te cu GitHub și alege repo-ul. Articolele noi pornesc ca ciorne; apar pe site când debifezi „Ciornă”. Configurarea e în `.pages.yml`.

**Din cod:** creează `src/content/posts/ro/nume-articol.md` (și opțional varianta din `en/`, cu același nume de fișier) cu `title`, `description`, `date`, `lang` în antet. Numele fișierului devine adresa articolului. Pentru articole cu grafice folosește `.mdx` și importă componentele din `src/components/charts/`.

Analizele sunt reconstituiri istorice, nu recomandări de investiții.

# LucxePlanner — online 2D/3D-interieurontwerp

Merknaam: **LucxePlanner** (configureerbaar via `NEXT_PUBLIC_BRAND_NAME`). Logo-bestanden staan in `public/brand/`; de huisstijl (inktzwart, ivoor, goud; Cormorant Garamond, Cinzel en Jost, zelf gehost) in `src/app/globals.css`.

Eén product, twee gescheiden onderdelen:

| Onderdeel | Pad | Toelichting |
| --- | --- | --- |
| Marketingwebsite | `src/app/(marketing)` | Openbaar, statisch gerenderd, werkt zonder JavaScript |
| Accounts | `src/app/(auth)`, `src/app/auth` | Registreren, e-mailverificatie, inloggen, wachtwoordherstel |
| Ontwerpstudio | `src/app/app` | Beveiligd: dashboard, 2D-editor, 3D-weergave, account |
| Ontwerpengine | `src/domain/project` | Pure TypeScript: datamodel, geometrie, bewerkingen, 3D-scène. Geen React, volledig getest |

## Wat werkt nu (en wat niet)

**Werkend en getest**

- Marketingwebsite: homepage, functies, hoe het werkt, prijzen, inspiratie, vragen, contact, privacy, voorwaarden; SEO (titels, descriptions, sitemap, robots, FAQ-structured data).
- Accounts via Supabase Auth: registreren met e-mailverificatie, inloggen, uitloggen, wachtwoord vergeten/opnieuw instellen, account verwijderen (met al je ontwerpen).
- Dashboard: ontwerp aanmaken (optioneel direct met een kamer op maat), openen, hernoemen, dupliceren, verwijderen met bevestiging, lege toestand, miniaturen (live uit de projectdata).
- Beveiliging: Row Level Security op alle tabellen, projectlimiet per plan in de database, abonnementen niet door gebruikers te wijzigen, open-redirectbescherming.
- 2D-editor: kamer op maat, muren tekenen/verslepen/op maat zetten/verwijderen, hoekpunten verslepen (aansluitende muren rekken mee), deuren en ramen plaatsen/verschuiven/omdraaien, 11 meubels plaatsen/verslepen/draaien/op maat zetten/dupliceren, snappen aan raster, muurpunten, assen en (voor meubels) tegen muren, maatlijnen met binnenmaten, zoomen en verschuiven, eigenschappenpaneel, sneltoetsen, ongedaan maken/opnieuw.
- Opslaan: autosave met debounce, één verzoek tegelijk, revisiecontrole (een oudere versie kan nooit een nieuwere overschrijven), zichtbare status, automatisch opnieuw proberen bij storing, lokale back-up van niet-opgeslagen werk, waarschuwing bij het sluiten van het tabblad, conflictmelding met download van je eigen versie.
- 3D: interactief WebGL-model uit dezelfde projectdata (muren met uitsparingen voor deuren/ramen, vloer, meubels), draaien/zoomen/verschuiven, standpunten, "poppenhuis"-weergave, muur- en vloerkleuren, kleur per meubel.

**Bewust nog niet gebouwd** (zie ook `/functies` op de site)

- Betalingen (Stripe): architectuur is voorbereid (`plans`, `entitlements`), er zijn géén schijnbetalingen.
- Meerdere verdiepingen in de interface (het datamodel ondersteunt het al).
- Niet-rechthoekige vloeren: zelf getekende muren krijgen (nog) geen automatische vloer.
- Export naar PNG/PDF, projecten delen, rondwandelen in 3D, fotorealistische beelden, materiaalbibliotheek met texturen.
- Volwaardig tekenen op telefoon/tablet (bekijken werkt; tekenen is voor laptop/desktop).
- Opgeslagen miniatuurafbeeldingen (miniaturen worden nu live uit de data getekend).
- Analytics (bewust uit; geen cookiebanner nodig zolang dat zo blijft).

## Fotorealistisch renderen en 3D-modellen

- In de studio (3D-weergave) maakt de knop **Fotorealistische render** een foto-echt beeld op ooghoogte met path tracing (`three-gpu-pathtracer`): daglicht door de ramen, weerkaatsend licht, zachte schaduwen. Het rendert op de computer van de gebruiker; met een videokaart duurt een beeld seconden tot enkele minuten.
- De beelden op de website (`public/renders/*.jpg`) zijn met dezelfde renderer gemaakt. Opnieuw maken na het aanpassen van voorbeelden of meubels:
  ```bash
  pnpm dev                      # in één terminal
  pnpm render:samples           # in een tweede terminal (eenmalig eerst: pnpm exec playwright install chromium)
  ```
  Instelbaar met `RENDER_WIDTH`, `RENDER_HEIGHT` en `RENDER_SAMPLES` (standaard 1600 × 1000, 512 samples).
- Realistische 3D-modellen staan in `public/models/` (glTF, opgeschoond en verkleind). Herkomst en licenties (CC0 / CC-BY 4.0) staan in `MODEL_CREDITS` in `src/domain/project/catalog.ts` en op de pagina `/licenties`. Een model toevoegen: zet het `.glb`-bestand in `public/models/` en voeg een catalogusitem met `model` toe; de standaardmaten moeten de maten van het model zijn. Zonder (werkend) model valt de app terug op de eigen parametrische vorm.

## Techniek

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (PostgreSQL + Auth) · Zod · eigen SVG-editor · Three.js via React Three Fiber · Vitest · Playwright · pnpm.

Zie [`docs/architectuur.md`](docs/architectuur.md) voor de onderbouwing (waaronder de afweging om OpenPlan3D niet als basis te gebruiken), het datamodel en de beveiliging.

## Snel lokaal uitproberen (zonder Supabase)

Alleen [Node.js](https://nodejs.org) (LTS-versie, 20.9 of nieuwer) is nodig. Geen database-installatie, geen account.

```bash
git clone https://github.com/RikBosman/luxceplanner.git
cd luxceplanner
git checkout claude/dazzling-einstein-9471kt
npm install -g pnpm        # eenmalig
pnpm install
pnpm dev
```

Open daarna <http://localhost:3000>. `pnpm dev` start automatisch in **lokale modus** (ingesteld in `.env.development`):

- je hoeft niet te registreren of in te loggen; "Inloggen" en "Gratis beginnen" brengen je direct naar de studio;
- ontwerpen worden opgeslagen in `.data/ruimte-lokaal.json` in de projectmap (verwijder dat bestand om opnieuw te beginnen);
- er is geen limiet op het aantal ontwerpen;
- wijzigingen in de code zie je direct in de browser.

Lokale modus is alleen bedoeld voor ontwikkelen en uitproberen, niet voor een publieke website (iedereen die de site kan bereiken, ziet alle ontwerpen). Wil je een productiebuild lokaal draaien, zet dan `RUIMTE_MODE=local` in `.env.local` vóór `pnpm build && pnpm start`.

## Lokaal starten met Supabase

Vereisten: Node.js 20.9+ (22 aanbevolen), pnpm 10, en een Supabase-project (gratis plan volstaat) **of** de Supabase CLI met Docker.

```bash
pnpm install
cp .env.example .env.local   # vul de waarden in, zie hieronder
pnpm dev                      # http://localhost:3000
```

Zet daarvoor in `.env.local` ook `RUIMTE_MODE=supabase`, anders blijft `pnpm dev` in lokale modus. Zonder Supabase-gegevens (en buiten lokale modus) tonen de inlogpagina's een duidelijke melding.

### Omgevingsvariabelen

| Variabele | Verplicht | Uitleg |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ja | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Project Settings → API → anon/publishable key. Mag in de browser; toegang wordt door RLS afgedwongen |
| `NEXT_PUBLIC_SITE_URL` | ja (productie) | Publieke URL, bijv. `https://www.jouwdomein.nl`. Gebruikt voor e-maillinks, sitemap en canonieke URL's |
| `NEXT_PUBLIC_BRAND_NAME` | nee | Merknaam, standaard `LucxePlanner` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | nee | Contactadres op de site en in juridische teksten |
| `RUIMTE_MODE` | nee | `local` = lokale modus zonder Supabase (standaard bij `pnpm dev`), anders Supabase |
| `RUIMTE_DATA_DIR` | nee | Map voor de lokale opslag, standaard `.data` |

Er is bewust **geen** service-role-sleutel nodig in de app. Gebruik die nooit in clientcode.

### Database inrichten (Supabase)

1. Maak een project aan in een **EU-regio** (bijv. Frankfurt) i.v.m. de AVG.
2. Voer de migratie uit: SQL Editor → plak `supabase/migrations/20261012000000_init.sql` → Run. Of met de CLI: `supabase link` en daarna `supabase db push`.
3. Authentication → URL Configuration:
   - Site URL: je `NEXT_PUBLIC_SITE_URL`
   - Redirect URLs: `https://jouwdomein.nl/auth/confirm` (en `http://localhost:3000/auth/confirm` voor ontwikkeling)
4. Authentication → Providers → Email: "Confirm email" **aan**; minimale wachtwoordlengte 8.
5. Aanbevolen e-mailsjablonen (werken ook als de link in een andere browser wordt geopend):
   - Confirm signup: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&volgende=/app">Bevestig je e-mailadres</a>`
   - Reset password: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Nieuw wachtwoord instellen</a>`

   Laat je de standaardsjablonen staan, dan werkt het ook, maar alleen in dezelfde browser waarin geregistreerd is.
6. Stel voor productie een eigen SMTP-dienst in (Authentication → SMTP). De ingebouwde Supabase-mail is alleen voor testen en sterk gelimiteerd.
7. De limiet van het gratis plan staat in `public.plans` (nu 3 ontwerpen) en op de prijzenpagina; houd die gelijk.

## Testen

```bash
pnpm typecheck        # TypeScript
pnpm lint             # ESLint
pnpm test             # Vitest: datamodel, geometrie, bewerkingen, 3D-scène, autosave
pnpm test:db          # Beveiligingstests van de database tegen een tijdelijke PostgreSQL (vereist PostgreSQL 15+)
pnpm test:e2e         # Playwright: website, accounts, editor, opslaan, conflicten, 3D
pnpm test:e2e:local   # dezelfde editortests in lokale modus (zonder Supabase; Linux/macOS)
```

De accounts- en editortests hebben een draaiende Supabase-omgeving nodig. Zonder Docker kan dat met de meegeleverde lichte teststack (PostgreSQL + Supabase Auth + PostgREST + een mini-gateway en e-mailopvang):

```bash
bash tests/stack/start.sh   # downloadt Supabase Auth en PostgREST naar .stack/ en start alles
pnpm test:e2e
bash tests/stack/stop.sh    # --reset om de testdatabase te wissen
```

Zonder die stack worden die tests overgeslagen (niet stilletjes geslaagd: Playwright meldt ze als "skipped").

## Veilig uitrollen

- Host de Next.js-app bij een partij met EU-regio (bijv. Vercel Pro, Netlify, of een eigen server met `pnpm build && pnpm start`). Let op: het gratis Vercel Hobby-plan is niet bedoeld voor commercieel gebruik.
- Zet de omgevingsvariabelen in de hosting-omgeving, nooit in de repository.
- Gebruik HTTPS (standaard bij genoemde hosts). De app zet basisbeveiligingsheaders (`next.config.ts`).
- Draai de migraties vóór de nieuwe code live gaat; draai `pnpm test:db` in CI.
- Zet in Supabase back-ups aan (Pro-plan: dagelijks) en sluit verwerkersovereenkomsten met Supabase, de hostingpartij en de e-maildienst.
- Laat de privacyverklaring en voorwaarden (nu concepten) door een jurist controleren en vul bedrijfsgegevens in.

## Projectstructuur

```
src/
  app/(marketing)/      openbare pagina's
  app/(auth)/           inloggen, registreren, wachtwoord
  app/auth/confirm/     verwerkt links uit e-mails
  app/app/              beveiligde studio (dashboard, account, projecten/[id])
  components/editor/    2D-canvas, panelen, 3D-weergave, autosave-status
  components/plan/      statische SVG-weergaven (miniaturen, website)
  domain/project/       datamodel, validatie, migraties, geometrie, bewerkingen, snapping, 3D-scène (+ tests)
  lib/                  opslag (Supabase of lokaal bestand), serveracties, autosave
  proxy.ts              sessieverversing en toegangscontrole voor /app
supabase/migrations/    databaseschema met RLS
supabase/tests/         SQL-beveiligingstests
tests/e2e/              Playwright-tests
tests/stack/            lichte lokale Supabase-teststack
docs/                   architectuur en voorbeeldbestand (voorbeeld-ontwerp.json)
```

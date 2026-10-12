# Architectuur en technische keuzes

## 1. Bestaande open-source basis of zelf bouwen?

Onderzocht in oktober 2026:

| Project | Licentie | Techniek | Beoordeling |
| --- | --- | --- | --- |
| [OpenPlan3D](https://github.com/laanlabs/openPlan3D) | MIT | SvelteKit, Three.js, Firebase | Inhoudelijk sterk (muren, deuren, kamers, 3D, export), maar ontworpen als **lokale app zonder accounts** ("your projects stay on your device"). Svelte past niet bij de gewenste React/Next.js-stack; accounts, serveropslag en een eigen UX zouden een groot deel herschrijven betekenen. |
| [react-planner](https://github.com/cvdlab/react-planner) (cvdlab) | MIT | React 16, Redux, Immutable.js, JavaScript | Verouderde stack (geen TypeScript, oude React-patronen), veel openstaande issues; aanpassen naar de gewenste UX kost meer dan opnieuw bouwen. |
| blueprint3d en forks | divers, per fork controleren | Three.js, oud | Niet actief onderhouden; licenties per fork onduidelijk. |

**Besluit:** zelf bouwen op Next.js, met een kleine, eigen en volledig geteste ontwerpengine. Redenen: gebruiksgemak is het onderscheidend vermogen (dus volledige controle over de UX), accounts en serveropslag zijn kern, en de benodigde geometrie voor een MVP is overzichtelijk. OpenPlan3D (MIT) blijft een nuttige referentie voor latere functies zoals kamerdetectie en DXF-export; bij overname van code de MIT-licentietekst meenemen.

## 2. Gekozen stack

- **Next.js 16 + React 19 + TypeScript (strict)**: één codebase voor marketing (statisch, SEO) en app (dynamisch, beveiligd).
- **Supabase**: PostgreSQL, Auth en Row Level Security; EU-hosting mogelijk; gratis start.
- **Eigen SVG-editor** in plaats van React Konva: geen extra afhankelijkheid, scherpe weergave op elk zoomniveau, DOM-elementen zijn direct testbaar en toegankelijk; ruim voldoende voor honderden elementen. Overstappen naar canvas (Konva) kan later per laag als prestaties dat vragen, zonder het datamodel te raken.
- **Three.js via React Three Fiber** voor 3D; alleen geladen als de gebruiker op "3D" klikt (code-splitting).
- **Zod** voor validatie op de server (opslaan) en bij het laden.
- **Vitest** (engine), **SQL-tests** (database), **Playwright** (gebruikersroutes).

## 3. Datamodel

Eén JSON-document per project (`src/domain/project/schema.ts`), opgeslagen in `projects.document`:

- `schemaVersion` + migraties (`migrate.ts`): oude ontwerpen worden bij het openen automatisch bijgewerkt; nieuwere versies worden geweigerd met een duidelijke melding.
- Alle maten in **millimeters**; afronden alleen bij weergave. Coördinaten: plattegrond van bovenaf, x naar rechts, y naar beneden. In 3D: x → x, y → z, hoogte → y.
- `floors[]` (voorbereid op verdiepingen) met `walls`, `openings` (aan een muur gekoppeld via `wallId` + `offset`), `rooms` (vloerpolygonen) en `furniture`.
- `materials[]` met kleuren; elementen verwijzen ernaar.
- Stabiele string-ID's; de validatie controleert unieke ID's en geldige verwijzingen.

Alle bewerkingen (`commands.ts`) zijn pure functies: ze geven een nieuw document terug. Dat maakt ongedaan maken/opnieuw triviaal en betrouwbaar, en alles is zonder browser te testen. De 3D-scène wordt eveneens als pure functie uit het document berekend (`scene.ts`), waardoor 2D en 3D per definitie dezelfde data tonen.

## 4. Opslaan en betrouwbaarheid

- Autosave (`src/lib/editor/autosave.ts`): debounce 1,2 s, nooit meer dan één verzoek tegelijk, automatisch opnieuw proberen met oplopende wachttijd.
- Elke opslag stuurt de verwachte `revision`; de databasefunctie `save_project_document` werkt alleen bij als die klopt. Een oudere autosave (of een ander tabblad) kan dus nooit nieuwer werk overschrijven; de gebruiker krijgt dan een conflictmelding en kan zijn versie downloaden.
- Niet-opgeslagen werk wordt lokaal (localStorage) bewaard en bij heropenen aangeboden om te herstellen.
- De server valideert elk document met Zod; de database controleert daarnaast type en maximale grootte (5 MB).

## 5. Beveiliging

- Row Level Security op alle tabellen: gebruikers zien en wijzigen alleen eigen projecten. Getest in `supabase/tests/security.test.sql` (12 scenario's) en in Playwright (een andere gebruiker krijgt 404).
- Rechten worden expliciet toegekend per kolom; `owner_id`, `revision` en tijdstempels zijn niet door de gebruiker te zetten.
- Projectlimiet per plan wordt in een databasetrigger afgedwongen (met lock tegen gelijktijdige verzoeken).
- `entitlements` en `plans` zijn alleen-lezen voor gebruikers; later schrijft alleen een betaalprovider-webhook (service role) hierin.
- Accountverwijdering via een `security definer`-functie die uitsluitend de eigen gebruiker verwijdert; projecten volgen via `on delete cascade`.
- Sessies via httpOnly-cookies (`@supabase/ssr`); `proxy.ts` ververst sessies en weert niet-ingelogde bezoekers van `/app`; elke serverpagina en -actie controleert opnieuw met `auth.getUser()`.
- Geen eigen wachtwoordopslag of cryptografie. Geen geheimen in clientcode.

## 6. Betalingen (voorbereid, niet gebouwd)

Plan: Stripe Checkout + Customer Portal. Een webhook-route (server, met service-role-sleutel uitsluitend op de server) zet `entitlements.plan_id/status/current_period_end`. Limieten worden nu al uit die tabel gelezen, dus de app hoeft daarvoor niet te veranderen.

## 7. Belangrijkste risico's

1. **Geometrie-randgevallen**: schuine muren, overlappende kamers en automatische kamerdetectie zijn lastig. Nu: rechthoekige kamers + vrije muren; vloer alleen voor kamers die via "kamer toevoegen" ontstaan.
2. **Prestaties bij grote plattegronden** (SVG met duizenden elementen, één mesh per blok in 3D). Oplossing indien nodig: canvas-laag, instancing/merging in 3D.
3. **E-mailbezorging**: zonder eigen SMTP komen verificatiemails niet betrouwbaar aan.
4. **Juridisch**: privacyverklaring en voorwaarden zijn concepten.
5. **Mobiel**: de editor is voor desktop/laptop ontworpen.
6. **Merknaam "Ruimte"**: generiek woord, mogelijk lastig te beschermen en als domein bezet; vroeg uitzoeken.

## 8. Verwachte externe kosten (indicatief, prijzen vóór lancering controleren)

| Dienst | Start | Bij lancering |
| --- | --- | --- |
| Supabase | Gratis plan | Pro, ca. $25/maand (geen pauzeren, dagelijkse back-ups) |
| Hosting Next.js | Gratis (niet-commercieel) | Bijv. Vercel Pro ca. $20/maand per teamlid, of eigen VPS vanaf ca. €5–10/maand |
| Transactionele e-mail (SMTP) | Gratis tier (bijv. Brevo/Resend/Postmark) | €0–15/maand afhankelijk van volume |
| Domein | — | ca. €10–20/jaar |
| Stripe | — | Geen vaste kosten; percentage per transactie |

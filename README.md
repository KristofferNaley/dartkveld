# Dartkveld

Dart-app for vennegjengen. Før poeng på mobilen og vis tavla på TV-en (AirPlay eller nettleser). V1 har Mickey Mouse. Appen er bygget slik at 501, 301 og Around the Clock kan legges til senere.

**Stack:** Next.js 16 (App Router, standalone), Better Auth (e-post og passord), PostgreSQL med Drizzle ORM, Tailwind CSS 4 og Vitest.

## Kom i gang

Appen er laget for å koble seg til en **eksisterende PostgreSQL-server** (14 eller nyere) som kjører i Docker på samme vert. Den har ingen egen database-container.

1. Opprett en rolle og en database på Postgres-serveren (her heter containeren `postgres`):

   ```bash
   docker exec -it postgres psql -U postgres -c "create role dart login password 'velg-et-passord'" -c "create database dart owner dart"
   ```

2. Fyll inn `.env`:

   ```bash
   cp .env.example .env
   openssl rand -base64 32   # til BETTER_AUTH_SECRET
   ```

   Sett `DATABASE_URL=postgres://dart:velg-et-passord@postgres:5432/dart`, og `DB_NETWORK` til Docker-nettverket der Postgres ligger (standard `backend`).

3. Start appen:

   ```bash
   docker compose up -d --build
   ```

Appen svarer på <http://localhost:3014>, eller porten du setter i `APP_PORT`. Migrasjonene kjøres automatisk mot databasen hver gang app-containeren starter, så tabellene lages første gang. Registrering krever en invitasjonslenke fra en gruppe (se under). Bare den aller første brukeren kan registrere seg uten. Vil du stenge helt, sett `DISABLE_SIGNUP=true` og kjør `docker compose up -d`.

Kjører Postgres utenfor Docker, kan `DATABASE_URL` peke på `host.docker.internal` eller en IP i stedet. Da kan du fjerne `db`-nettverket fra `docker-compose.yml`.

### Miljøvariabler

| Variabel | Beskrivelse |
| --- | --- |
| `DATABASE_URL` | Tilkobling til den eksisterende Postgres-serveren |
| `DB_NETWORK` | Docker-nettverket der Postgres ligger (standard `backend`, må finnes fra før) |
| `BETTER_AUTH_SECRET` | Lang, tilfeldig streng |
| `BETTER_AUTH_URL` | Offentlig adresse, f.eks. `https://dart.example.no` |
| `APP_URL` | Samme adresse. Brukes til delingslenker og Open Graph. |
| `APP_PORT` | Port på verten (valgfri, standard 3014, bundet til 127.0.0.1) |
| `ADMIN_EMAILS` | Kommaseparert liste over admin-adresser. Gir tilgang til `/admin`. En konto får rollen første gang den er innom etter at adressen er lagt til. |
| `DISABLE_SIGNUP` | `true` skrur av all registrering, også med invitasjon |

### Bak reverse proxy

Containeren lytter bare på `127.0.0.1:${APP_PORT}`. Pek proxyen (Caddy, nginx, Traefik eller Cloudflare Tunnel) dit, og sett `BETTER_AUTH_URL` og `APP_URL` til den offentlige https-adressen. Ellers avviser innloggingen forespørsler fra feil origin, og delingslenkene peker feil. Bak Cloudflare sender appen vanlig http videre til https.

Trenger proxyen å nå appen over et Docker-nettverk (f.eks. et felles `edge`-nettverk med cloudflared), kan du legge det til i en lokal `docker-compose.override.yml`, som leses automatisk:

```yaml
services:
  app:
    networks: [edge]
networks:
  edge:
    external: true
```

## Utvikling

Node trenger ikke være installert på verten. `scripts/npm.sh` kjører npm i en `node:22-alpine`-container:

```bash
./scripts/npm.sh install
./scripts/npm.sh run check      # lint + typecheck + tester
./scripts/npm.sh run db:generate  # ny migrasjon etter endring i src/db/schema.ts
```

## Backup av databasen

Kommandoene under antar at Postgres-containeren heter `postgres`.

Ta backup (komprimert SQL-dump):

```bash
mkdir -p backup && docker exec postgres pg_dump -U dart -d dart --no-owner | gzip > backup/dart-$(date +%F).sql.gz
```

Gjenopprett (overskriver innholdet i databasen):

```bash
docker compose stop app
docker exec postgres psql -U postgres -c "drop database dart with (force)" -c "create database dart owner dart"
gunzip -c backup/dart-2026-11-07.sql.gz | docker exec -i postgres psql -U dart -d dart
docker compose start app
```

Legg gjerne backup-kommandoen i cron, for eksempel hver natt kl. 04: `0 4 * * * cd /sti/til/dart && …`.

## Struktur

```
src/
  games/                 Spillregler som rene funksjoner (ingen UI/DB)
    core/                Spill-interface, tur/rotasjon, replay og angre
    mickey-mouse/        Regler og tester
    index.ts             Register over spill
  components/games/      Tavlekomponenter per spill (kompakt + TV)
  lib/matches.ts         Kamptjeneste: lasting, kast/angre i transaksjon, deling, statistikk
  lib/live/feed.ts       Live-oppdatering (polling hvert 2. sek, kan byttes til SSE)
  hooks/                 useScoring (optimistisk kø), useLiveMatch, useWakeLock
  app/
    (app)/               Innlogget app: forside, ny kamp, kamp, historikk, profil, grupper, hjelp, admin
    (tv)/kamp/[id]/vis   Visningsmodus for storskjerm (innlogget medlem)
    (tv)/tv, tv/[code]   Visning på TV med kampkode, uten innlogging (skrivebeskyttet)
    r/[token]            Offentlig resultatside + OG-bilde
    api/kamper/[id]      GET (polling, medlemmer), POST kast, POST angre
    api/tv/[code]        GET (polling uten innlogging, nøkkel = kampkoden)
    manifest.ts, icon*   Webapp-manifest og ikoner (hjemskjerm på iPhone og Android)
```

### Grupper, invitasjoner og kampkode

- Kamper, spillere og statistikk hører til en **gruppe** (`group`, `group_member`, `group_invite`, `match.group_id`). Alle innloggede kan lage grupper og blir admin i dem. En bruker kan være med i flere, og den aktive gruppa ligger i en cookie (`dart_gruppe`).
- **Invitasjonslenke** `/bli-med/<kode>`. Registrering krever en gyldig kode (headeren `x-invite-code` sjekkes i en Better Auth-hook i `src/lib/auth.ts`). Gruppeadmin kan lage ny lenke, som gjør den gamle ugyldig.
- Hver kamp har en **kampkode** på fem tegn (`match.code`). `/tv` tar imot koden og viser kampen uten innlogging. Koden gir bare visning, og polling går via `/api/tv/<kode>` som aldri sender ut delingslenken. Å føre poeng krever innlogging og at man er deltaker eller eier.
- Migrasjon 0005 flyttet alle eksisterende brukere og kamper inn i gruppa «Dartkveld».

### Admin

`/admin` (oversikt over bruk per uke) og `/admin/brukere` (nytt midlertidig passord, sperre, slett) er bare for admin. Admin er brukere med rollen `admin`: adresser i `ADMIN_EMAILS` får den automatisk. Appen bruker Better Auth sin `admin`-utvidelse (kolonnene `role`, `banned`, `ban_reason`, `ban_expires`). Å slette en bruker sletter også kampene brukeren opprettet (bekreftelsen viser hvor mange).

**Kampstate** lagres aldri. Den utledes alltid fra kastlisten (`throw`-tabellen) med `replay()`. Klienten og serveren bruker den samme spillmodulen. Angre er «slett siste kast». Hvert kast sendes med forventet løpenummer (`expectedSeq`), så to telefoner som fører samtidig får en konflikt (409) i stedet for doble kast.

### Legge til et nytt spill

1. Lag `src/games/<spill>/rules.ts` som implementerer `Game` fra `src/games/core/types.ts`, og skriv tester.
2. Registrer spillet i `src/games/index.ts`.
3. Lag tavlekomponenter og registrer dem i `src/components/games/registry.tsx`.

## Statistikk

`/statistikk` viser egen statistikk, `/statistikk/gjengen` viser en tabell for alle, og `/statistikk/spiller/[id]` viser en annen spiller. Alt regnes ut fra `throw`-tabellen ved hver visning, i rene funksjoner i `src/lib/stats/compute.ts` (med tester). Databasen har ingen egne statistikktabeller.

- **Treff** er piler som ga minst ett merke. **Merker** er det pila ville gitt på et åpent felt: single 1, dobbel 2, trippel 3, Bull 1, Bullseye 2 (en dobbel/trippel som telte på Dobbel-/Trippel-feltet gir 1).
- **Merker per runde** er merker delt på antall piler, ganget med 3 (det vanlige målet i cricket-dart, «marks per round»).
- **Favorittfelt** telles på tallet pila faktisk traff, uansett ring.
- Bare registrerte brukere er med. Gjester telles ikke. Seier på lag teller for alle på laget, mens kast bare teller for den som kastet.
- Kast etter midnatt hører til kvelden før («Kveldens beste»).

## Mickey Mouse-regler (slik de er implementert)

Reglene ligger i `src/games/mickey-mouse/rules.ts`, med tester ved siden av. Endrer du reglene der, følger resten av appen etter.

- Feltene 20–15, Dobbel, Trippel og Bull teller, i valgfri rekkefølge. Pila føres slik den landet, med tall og ring: single gir 1 treff på tallet, dobbel 2 og trippel 3. En dobbel/trippel på 15–20 kan i stedet telle som ett treff på Dobbel-/Trippel-feltet (den som fører velger, `ring: true`). En dobbel/trippel på 1–14 teller bare på Dobbel/Trippel, og en single på 1–14 er bom.
- Bull (grønn) gir 1 treff og Bullseye (rød, `multiplier: 2` på felt 25) gir 2 treff på Bull. Bullseye teller ikke som Dobbel.
- Treff utover tre på et felt forsvinner. Eldre kast med feltkode 102/103 (Dobbel/Trippel uten tall) teller 1 treff på ringen som før.
- Tre treff lukker et felt for laget. Treff på et felt laget allerede har lukket, teller ikke.
- Et felt er stengt når alle lag har lukket det (vises på tavla).
- Ingen poeng: laget som først lukker alle feltene, vinner med en gang. Pilene som er igjen i runden ignoreres.
- Kampstate utledes fra kastene med reglene slik de er nå. Endres reglene slik at gamle kamper ville fått et annet resultat, bør den gamle varianten registreres som et eget spill med `hidden: true` og de gamle kampene få den spilltypen.
- Angre etter at kampen er ferdig gjenåpner den. Delingslenken trekkes da tilbake, og en ny lenke lages når kampen avsluttes igjen.

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

Appen svarer på <http://localhost:3014>, eller porten du setter i `APP_PORT`. Migrasjonene kjøres automatisk mot databasen hver gang app-containeren starter, så tabellene lages første gang. Når alle i gjengen har laget konto, kan du sette `DISABLE_SIGNUP=true` og kjøre `docker compose up -d`.

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
| `DISABLE_SIGNUP` | `true` skrur av registrering |

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
    (app)/               Innlogget app: forside, ny kamp, kamp, historikk, profil
    (tv)/kamp/[id]/vis   Visningsmodus for storskjerm
    r/[token]            Offentlig resultatside + OG-bilde
    api/kamper/[id]      GET (polling), POST kast, POST angre
```

**Kampstate** lagres aldri. Den utledes alltid fra kastlisten (`throw`-tabellen) med `replay()`. Klienten og serveren bruker den samme spillmodulen. Angre er «slett siste kast». Hvert kast sendes med forventet løpenummer (`expectedSeq`), så to telefoner som fører samtidig får en konflikt (409) i stedet for doble kast.

### Legge til et nytt spill

1. Lag `src/games/<spill>/rules.ts` som implementerer `Game` fra `src/games/core/types.ts`, og skriv tester.
2. Registrer spillet i `src/games/index.ts`.
3. Lag tavlekomponenter og registrer dem i `src/components/games/registry.tsx`.

## Mickey Mouse-regler (slik de er implementert)

Reglene ligger i `src/games/mickey-mouse/rules.ts`, med tester ved siden av. Endrer du reglene der, følger resten av appen etter.

- Feltene 20–15, Dobbel, Trippel og Bull teller, i valgfri rekkefølge. Dobbel er et treff hvor som helst i dobbelringen, og Trippel hvor som helst i trippelringen. Den som fører velger hvilket felt pila teller på.
- Hvert treff teller 1. Tastaturet har derfor ikke multiplikatorvalg.
- Tre treff lukker et felt for laget. Treff på et felt laget allerede har lukket, teller ikke.
- Et felt er stengt når alle lag har lukket det (vises på tavla).
- Ingen poeng: laget som først lukker alle feltene, vinner med en gang. Pilene som er igjen i runden ignoreres.
- Kampstate utledes fra kastene med reglene slik de er nå. Endres reglene slik at gamle kamper ville fått et annet resultat, bør den gamle varianten registreres som et eget spill med `hidden: true` og de gamle kampene få den spilltypen.
- Angre etter at kampen er ferdig gjenåpner den. Delingslenken trekkes da tilbake, og en ny lenke lages når kampen avsluttes igjen.

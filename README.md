# Dartkveld

Dart-app for vennegjengen. Før poeng på mobilen og vis tavla på TV-en (AirPlay eller nettleser). V1 har Mickey Mouse. Appen er bygget slik at 501, 301 og Around the Clock kan legges til senere.

**Stack:** Next.js 16 (App Router, standalone), Better Auth (e-post og passord), PostgreSQL med Drizzle ORM, Tailwind CSS 4 og Vitest.

## Kom i gang

```bash
cp .env.example .env
# Fyll inn POSTGRES_PASSWORD (samme passord i DATABASE_URL) og BETTER_AUTH_SECRET:
openssl rand -base64 32
docker compose up -d --build
```

Appen svarer på <http://localhost:3014>, eller porten du setter i `APP_PORT`. Migrasjonene kjøres automatisk hver gang app-containeren starter. Når alle i gjengen har laget konto, kan du sette `DISABLE_SIGNUP=true` og kjøre `docker compose up -d`.

### Miljøvariabler

| Variabel | Beskrivelse |
| --- | --- |
| `DATABASE_URL` | Postgres-tilkobling. I compose er verten `db`. |
| `POSTGRES_USER/PASSWORD/DB` | Brukes av postgres-containeren |
| `BETTER_AUTH_SECRET` | Lang, tilfeldig streng |
| `BETTER_AUTH_URL` | Offentlig adresse, f.eks. `https://dart.example.no` |
| `APP_URL` | Samme adresse. Brukes til delingslenker og Open Graph. |
| `APP_PORT` | Port på verten (valgfri, standard 3014, bundet til 127.0.0.1) |
| `DISABLE_SIGNUP` | `true` skrur av registrering |

### Bak reverse proxy

Containeren lytter bare på `127.0.0.1:${APP_PORT}`. Pek proxyen (Caddy, nginx, Traefik eller Cloudflare Tunnel) dit, og sett `BETTER_AUTH_URL` og `APP_URL` til den offentlige https-adressen. Ellers avviser innloggingen forespørsler fra feil origin, og delingslenkene peker feil.

## Utvikling

Node trenger ikke være installert på verten. `scripts/npm.sh` kjører npm i en `node:22-alpine`-container:

```bash
./scripts/npm.sh install
./scripts/npm.sh run check      # lint + typecheck + tester
./scripts/npm.sh run db:generate  # ny migrasjon etter endring i src/db/schema.ts
```

## Backup av databasen

Ta backup (komprimert SQL-dump):

```bash
mkdir -p backup && docker exec dart-db pg_dump -U dart -d dart | gzip > backup/dart-$(date +%F).sql.gz
```

Gjenopprett (overskriver innholdet i databasen):

```bash
docker compose stop app
docker exec dart-db psql -U dart -d postgres -c "drop database dart with (force)" -c "create database dart owner dart"
gunzip -c backup/dart-2026-11-07.sql.gz | docker exec -i dart-db psql -U dart -d dart
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

- Feltene 20–12 og Bull teller. Tre treff lukker et felt (single 1, double 2, triple 3; Bull single 1, double 2).
- Har laget lukket et felt og **minst én** motstander ikke har det, gir overskytende treff poeng (Bull = 25). Overskudd fra pila som lukker feltet teller også.
- Et felt er stengt når alle lag har lukket det.
- Vinner: det første laget som har lukket alt og har **minst like mange** poeng som hvert av de andre lagene. Ved likhet vinner laget som lukker alt.
- Pilene som er igjen i runden etter vinnerkastet ignoreres.
- Angre etter at kampen er ferdig gjenåpner den. Delingslenken trekkes da tilbake, og en ny lenke lages når kampen avsluttes igjen.

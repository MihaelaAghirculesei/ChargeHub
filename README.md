# ChargeHub

[![CI](https://github.com/MihaelaAghirculesei/ChargeHub/actions/workflows/ci.yml/badge.svg)](https://github.com/MihaelaAghirculesei/ChargeHub/actions/workflows/ci.yml)

Dashboard per la gestione di infrastruttura di ricarica elettrica. Progetto portfolio costruito con Nuxt 4 e Vuetify 3, in sviluppo.

## Stack

- **Framework:** Nuxt 4 + TypeScript strict
- **UI:** Vuetify 3 (via `vuetify-nuxt-module`) + SCSS
- **State:** Pinia
- **Validazione:** Zod
- **Mappa:** MapLibre GL JS + OpenStreetMap
- **Grafici:** Chart.js (`vue-chartjs`)
- **Test:** Vitest + `@nuxt/test-utils` + Playwright
- **i18n:** `@nuxtjs/i18n`, tedesco (default) + inglese, routing localizzato (`/de/...`, `/en/...`)
- **Dati:** registro stazioni reale da [Open Charge Map](https://openchargemap.org/), telemetria simulata lato server (vedi `docs/adr/`)

## Setup

```bash
pnpm install
cp .env.example .env   # imposta NUXT_OCM_API_KEY, vedi sotto
pnpm dev
```

L'app valida la configurazione al boot: senza una `NUXT_OCM_API_KEY` valida in `.env`, il server si arresta con un errore esplicito invece di partire in uno stato inconsistente. La chiave si ottiene registrandosi su [openchargemap.org/site/develop/api](https://openchargemap.org/site/develop/api).

Serve anche una `NUXT_SESSION_PASSWORD` (almeno 32 caratteri) per il login — genera la tua, es. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Login

**Mock esplicito: nessun backend/database reale.** Due account fissi, hardcoded lato server (`server/utils/auth-session.ts`) solo per dimostrare guardie di rotta e permessi (Giorno 16) — non è pensato per la produzione.

| Utente     | Password      | Ruolo      | Può                                |
| ---------- | ------------- | ---------- | ---------------------------------- |
| `operator` | `operator123` | `operator` | Gestire le tariffe (`/tariffs`)    |
| `viewer`   | `viewer123`   | `viewer`   | Vedere le tariffe, non modificarle |

La sessione è un cookie httpOnly sigillato (firmato + cifrato con `NUXT_SESSION_PASSWORD`, via `useSession` di h3) — nessuno store server-side, coerente con il deploy serverless (stesso principio del simulatore di telemetria, vedi `docs/adr/0002-telemetry-simulation.md`).

## Script

| Comando                                                | Descrizione                  |
| ------------------------------------------------------ | ---------------------------- |
| `pnpm dev`                                             | Dev server                   |
| `pnpm build`                                           | Build di produzione          |
| `pnpm lint` / `pnpm lint:fix`                          | ESLint                       |
| `pnpm format` / `pnpm format:check`                    | Prettier                     |
| `pnpm typecheck`                                       | Type check TypeScript strict |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest                       |

## Stato del progetto

In sviluppo attivo. Le decisioni architetturali sono documentate come ADR in [`docs/adr/`](docs/adr/) man mano che vengono prese.

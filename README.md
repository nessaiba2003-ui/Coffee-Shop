# VELŌRA — your coffee, your creation

A personal coffee atelier built with React 19, TypeScript, Spring Boot 3.5 / Java 17, PostgreSQL, Spring Security and authenticated server-sent events. The editorial interface combines ivory, oxblood and chartreuse, cinematic photography, an animated layered coffee illustration and live DNA controls.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the architecture defined before implementation.

## Run locally on Windows

Prerequisites: Node.js 22+, Java 17+, Maven 3.9+. This workspace also contains a downloaded Maven distribution in ignored `.tools/`.

```powershell
npm.cmd ci --prefix frontend
./scripts/start-local.ps1
```

Open **http://127.0.0.1:5173**. The API listens on loopback port 8080. The script generates a random admin password in `.local/dev-credentials.json` on first use. Sign in with those credentials, open **Studio → Baristas**, and create individual staff accounts. Customers register through **Sign in → Create your passport**. Local logs are in `.local/`; process IDs are recorded in `.local/processes.json`. Stop existing project servers before running the script again.

The `dev` profile uses a real file-backed H2 database in `data/velora`. It survives restarts and is not a mock API. The Java socket directory override in the script handles Windows MSIX temporary-directory virtualization. Avoid mixing `localhost` and `127.0.0.1` during a session because cookies are host-specific.

For separate terminals:

```powershell
# Set ADMIN_EMAIL and ADMIN_PASSWORD before the first backend launch.
mvn -f backend/pom.xml package
java '-Djdk.net.unixdomain.tmpdir=.local' -jar backend/target/velora-1.0.0.jar --spring.profiles.active=dev
npm.cmd run dev --prefix frontend
```

## PostgreSQL and Docker

```powershell
Copy-Item .env.example .env
# Fill DATABASE_PASSWORD, ADMIN_EMAIL and ADMIN_PASSWORD with your values.
docker compose up --build -d
```

Open **http://127.0.0.1:3000**. Compose provides persistent PostgreSQL storage, Flyway migrations, the Java API and an Nginx frontend. `COOKIE_SECURE=false` in the example is for local HTTP only. For a hosted environment, terminate HTTPS, set secure cookies to true, configure forwarded protocol appropriately, and choose your published hostname. The provided Compose port binds to loopback by design. QR sharing links use the current browser origin; use a reachable HTTPS hostname when printing physical table cards.

## What works

- Mood-based and natural-language taste matching, with a provider interface for a future external AI integration. The current engine explicitly identifies itself as deterministic taste matching.
- All coffee customization controls, availability, price/calorie/time estimates, ingredient-aware previews and Coffee DNA. The server validates every recipe and calculates authoritative prices.
- BCrypt authentication, CSRF-protected sessions, three roles, immediate account deactivation/role refresh, rate-limited sign-in and registration, customer ownership checks.
- Saved recipes, personalized passport, favorite creation, repeat orders, streaks, points and earned achievements.
- Authenticated table orders, per-customer idempotency keys, immutable order snapshots, row-locked stock reservations, transactional completion deductions and cancellation releases.
- Staff queue with priority, full recipe details, elapsed time, seven craft stages, nine lifecycle statuses, assigned barista profiles and real SSE customer updates with polling fallback.
- Opt-in public recipe/DNA cards, revocable links, scannable QR codes and downloadable 1080×1920 story cards. No customer identity is included in public cards.
- Admin CRUD for ingredients, prices, stock, availability, origins, recipes, users, staff profiles and tables. User removal deactivates rather than deleting history. In-use inventory and recipe deletion is protected by database constraints.
- Real analytics for completed revenue, average value, daily activity, customer repeat rate, recipes, moods, customizations, ingredients, peak hours and creative profiles.
- Promotion, review and settings metadata management. Promotions are planning records, not automatic discounts; settings do not override security or deployment environment variables.

## Verification

```powershell
npm.cmd run build --prefix frontend
npm.cmd test --prefix frontend
mvn -f backend/pom.xml test
# With local API running and .local/dev-credentials.json present:
node scripts/smoke.mjs
```

The integration suite exercises ownership, authorization, input bounds, CSRF, stock accounting, cancellation rollback, concurrent idempotency, table tokens, recommendations and public sharing. The HTTP smoke test verifies actual session login, persisted orders, SSE updates, the entire crafting lifecycle, passport and analytics. It creates explicitly named verification records and saves its test credentials only in ignored `.local/`.

## Operational boundaries

No payment gateway is connected: orders are paid at the atelier. No camera feed is fabricated: staff profiles and stage updates provide the human craft experience. Nutrition is an ingredient-based estimate, not certified dietary information. Seeded ingredients/prices and the eight initial tables are editable starting catalog records; there are no fabricated customers, sales or testimonials.

This is a single-instance application. Production rollout still needs deployment-specific TLS, backups, monitoring, email verification/password recovery, account retention controls, and load testing. Multi-instance deployment requires shared sessions and an event broker. External AI, payments, reservations, subscriptions, NFC, AR, workshops, events and multi-location operations remain explicit extension boundaries. The PostgreSQL Compose stack must be validated on a host with Docker running; local verification uses H2.

## Design assets and references

Hero photography is downloaded from [Unsplash](https://images.unsplash.com/photo-1442512595331-e89e73853f31). The coffee visualization and DNA graphics are original SVG components. Typography: Instrument Serif, DM Sans and DM Mono via Google Fonts; system fallbacks are provided. Security follows Spring's [CSRF session guidance](https://docs.spring.io/spring-security/reference/features/exploits/csrf.html). The local Windows socket setting is documented in [Java networking properties](https://docs.oracle.com/en/java/javase/16/core/networking-properties.html).

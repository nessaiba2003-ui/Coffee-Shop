# VELŌRA — personal coffee atelier

## 1. Product architecture

A React/TypeScript client talks to a Spring Boot modular monolith through a same-origin `/api` boundary. PostgreSQL is the production source of truth. A file-backed H2 development profile allows genuine persistence without Docker. Neither profile simulates orders. Nginx serves the client and proxies API and server-sent events. Docker Compose provides PostgreSQL, API, and web.

## 2. Journeys

Discover → choose a mood or describe a drink → adjust the Coffee Lab → authenticate → save a recipe or place a table order → watch staff-driven preparation → reveal and share a public, opt-in coffee card → revisit the passport and reorder. Staff authenticate to a role-protected queue, advance orders, and complete delivery. Administrators manage catalog, tables, staff, customers, promotions and recipes, and inspect measured analytics.

## 3. Database

`users`: UUID, unique email, BCrypt hash, name, role, active flag, creation timestamp.
`ingredients`: UUID, category, name, price in integer cents, calories per portion, stock portions, low-stock threshold, availability, descriptive notes.
`recipes`: UUID, owner, name, JSON configuration, computed DNA, unique public sharing token (nullable), creation time.
`orders`: UUID, owner, recipe FK, immutable recipe/ingredient/price snapshots, table FK, barista FK, status, craft stage, priority, idempotency key, timestamps. Inventory is reserved atomically at order creation, deducted at completion, released on cancellation.
`order_items`: order FK, ingredient FK, portion quantity. Stock accounting uses row locks and transactions.
`tables`: UUID, label, random QR token, active.
`barista_profiles`: user FK, specialty, experience, image URL.
`records`: typed JSON records for promotions, reviews, settings and future location metadata. All are admin-only except approved public data.
Foreign keys and unique constraints enforce ownership and request idempotency. Financial amounts are integer cents, never client-supplied.

## 4. API

Session: `/auth/csrf`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`.
Customer: `/catalog`, `/recommend`, `/recipes`, `/recipes/{id}/share`, `/cards/{token}`, `/tables/{token}`, `/orders`, `/orders/{id}`, `/orders/{id}/events`, `/passport`.
Staff: `/staff/orders`, `/staff/orders/{id}/advance`, `/staff/orders/{id}/cancel`.
Admin: `/admin/analytics`, CRUD `/admin/ingredients`, `/admin/tables`, `/admin/users`, `/admin/recipes`, `/admin/records/{kind}`.
Errors use JSON with meaningful status codes. Authenticated order requests require UUID idempotency keys. The server validates ingredient categories, availability, configuration bounds and table identity, computes authoritative prices/DNA, and uses transactional stock reservations.

## 5. Frontend

Vite, React, TypeScript, React Router, Lucide icons. Shared API client with CSRF refresh, explicit loading/error/empty states, protected staff navigation. Components: editorial shell, coffee render, choice controls, sliders, recipe card, DNA plot, craft timeline, passport, operational tables. Browser draft storage contains only recipe preferences, never authentication credentials.

## 6. Authentication and roles

BCrypt passwords; server-side Spring Security sessions with HttpOnly, SameSite cookies; CSRF protection on mutations; session fixation protection; ownership checks on customer resources; CUSTOMER/BARISTA/ADMIN route protection. Admin bootstrap is environment-driven with no committed credentials. Deployment must enable secure cookies and HTTPS. Login/register are rate limited. Public cards are opt-in, unguessable, revocable, and exclude customer identity.

## 7. Real time

Authenticated Server-Sent Events (SSE), an appropriate one-way real-time transport, streams persisted order changes to its owner or staff. REST commands mutate state. Events publish after transaction commit. Reconnection reads persisted state; polling provides a fallback. No timers automatically progress customer orders. One API instance is supported initially; multi-instance fan-out requires a shared event broker and session store.

## 8. Visual system

Ivory #f5f2ea, ink #28291f, oxblood #601f31, chartreuse #d5e88b. Oversized editorial serif headlines, precise sans-serif controls, small monospaced labels; asymmetric photographic surfaces, thin rules, generous negative space, organic coffee illustration, restrained motion with reduced-motion support. Accessible keyboard controls and responsive layouts from 360px upward.

## Extension boundaries

Recommendations implement a provider interface with a transparent deterministic language/mood engine; an external AI provider can replace it without changing order logic. Payments, bookings, NFC, subscriptions, AR and multi-location support are extension work, not presented as existing functionality. Taxes, payment collection and refunds are outside the current in-store pay-at-counter workflow.

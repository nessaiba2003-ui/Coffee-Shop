# Verification — 3 September 2026

## Passed

- Frontend: TypeScript compile and Vite production build. Final JS bundle ~337 KB / 107 KB gzip; stylesheet ~43 KB / 10 KB gzip.
- Frontend calculation suite: **2 tests passed** (server-aligned price estimates and bounded DNA).
- Spring integration suite: **11 tests passed**, no failures or errors. Covers recipe validation, server pricing, reservation/completion/cancellation accounting, transaction rollback, concurrent idempotency, ownership, CSRF, roles, immediate account/role revocation, table token validation, public sharing/revocation, recommendations and analytics.
- Real HTTP smoke test: registration, session login, authorization, recipe persistence, table ordering, idempotent retry, authenticated SSE reception after a staff update, all order stages through completion, passport totals, opt-in sharing and revocation, and analytics passed against the packaged API and persistent development database.
- Browser: desktop homepage, mobile homepage, responsive Coffee Lab, keyboard temperature adjustment with live iced-drink preview, conversational recipe suggestion, administrator login/logout, role-specific navigation, analytics dashboard, table QR generation, customer login, passport/favorite ingredients/achievements, DNA share modal, story-card export action, and final coffee reveal.
- At a 390-pixel browser viewport, the Coffee Lab document width matched its client width: no horizontal page overflow.

## Environment and limits

- Local preview: `http://127.0.0.1:5173`, API: `http://127.0.0.1:8080`.
- Java 17, file-backed H2 in PostgreSQL compatibility mode. Production PostgreSQL schema, Flyway migrations, Dockerfiles and Compose are included, but Docker Desktop's daemon was not running, so the PostgreSQL container deployment was not executed.
- Source catalog records are editable initial atelier configuration. HTTP checks created clearly named `Verification` customers and orders in the development database; these are not real customer purchases. Local verification credentials are in ignored `.local/verification-account.json`.
- External AI and payment providers are not configured. The taste engine is deterministic and labeled accordingly; payment takes place at the counter.
- Backend, frontend and credentials/log locations are documented in `README.md`. Bootstrap admin credentials are generated locally and are not committed.

## Issues caught and corrected

- Spring transactional proxy field access: replaced cross-bean direct-field access with delegated accessors.
- Analytics SQL: replaced a database-reserved alias with a portable name; added a regression test.
- Windows Java socket initialization: uses an explicit workspace socket directory instead of the virtualized system temporary directory.
- Frontend type checking, floating photograph caption overlap, mobile slider touch target size, and deterministic DNA-axis ordering.
- Development hot reload: moved shared context out of the entry module and separated App from createRoot to remove a circular module dependency. Clean reload and navigation rechecked.

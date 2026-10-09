# Tally — Engineering Blueprint

Store rating platform. Single login, three roles, ratings 1–5.
This document is the source of truth for scope, design and delivery. Code follows it; when they disagree, fix one of them in the same PR.

| | |
|---|---|
| Stack | Node 20 · Express 5 · PostgreSQL 16 · React 18 (Vite) |
| Auth | JWT in an httpOnly cookie, bcrypt password hashes |
| Packaging | Docker Compose (db, api, web behind nginx) |
| Status | v1.0 scope below |

---

## 1. Scope

### 1.1 Requirements traceability

| # | Requirement (from the brief) | Where it lives |
|---|---|---|
| R1 | One login for every role, role-based access | `POST /api/auth/login`, `requireRole` middleware, role-aware router on the client |
| R2 | Normal users self-register | `POST /api/auth/signup` (always creates role `USER`) |
| R3 | Admin dashboard: total users, stores, ratings | `GET /api/admin/dashboard` |
| R4 | Admin adds stores, normal users, admins | `POST /api/admin/stores`, `POST /api/admin/users` |
| R5 | Admin lists stores (name, email, address, rating) with filters | `GET /api/admin/stores` |
| R6 | Admin lists users (name, email, address, role) with filters | `GET /api/admin/users` |
| R7 | Admin views a user; store owners also show their rating | `GET /api/admin/users/:id` |
| R8 | User lists/searches stores by name and address | `GET /api/stores?q=` |
| R9 | Store card shows overall rating, my rating, submit/modify | `GET /api/stores`, `PUT /api/stores/:id/rating` |
| R10 | Everyone updates own password | `PATCH /api/auth/password` |
| R11 | Store owner dashboard: raters + average | `GET /api/owner/dashboard` |
| R12 | Logout | `POST /api/auth/logout` clears cookie |
| R13 | Field validation (name 20–60, address ≤400, password 8–16 w/ upper + special, email) | zod schemas on the API, mirrored on the client, CHECK constraints in the DB |
| R14 | Sortable tables (asc/desc) | `sortBy` + `order` on every list endpoint, whitelisted |

### 1.2 Decisions on points the brief leaves open

1. **Name rule applies to stores too.** "Name: 20–60 chars" is listed under form validations without qualifying which form; we apply it to users and stores for consistency.
2. **One store per owner.** `stores.owner_id` is unique. A store may exist without an owner (admin assigns one later or at creation).
3. **Only `USER` can rate.** Admins and owners get 403 — otherwise an owner could rate their own store.
4. **One rating per user per store**, editable. Enforced by a unique constraint, not just app code.
5. **Admin-created users may be any role**, including `STORE_OWNER`. Public signup can only create `USER`.
6. **Ratings are stored as integers; averages are rounded to one decimal at read time.** Nothing derived is persisted.
7. **Out of scope for v1:** email verification, password reset by email, refresh tokens, soft delete, i18n.

---

## 2. Architecture

```
 Browser (React SPA)
     │  same-origin /api/*   (cookie auth, no CORS in prod)
     ▼
  nginx ──► static assets
     │
     └────► Express API ──► PostgreSQL
              │
              ├─ middleware: helmet · rate-limit · cookie auth · zod validation
              └─ modules:    auth · admin · stores · owner
```

### 2.1 Backend layout

```
backend/src
  config/        env parsing (fails fast on bad config), logger
  db/            pool, migration runner, seed, SQL migrations
  middleware/    authenticate, requireRole, validate, errorHandler
  modules/
    auth/        routes · service · schema
    admin/       users, stores, dashboard
    stores/      listing for normal users + rating upsert
    owner/       owner dashboard
  utils/         AppError, asyncHandler, pagination/sort helpers
  app.js         builds the Express app (no listen — testable)
  server.js      process entry, graceful shutdown
```

Layering rule: **routes** parse + authorise → **service** holds business rules and SQL → nothing else touches the pool. Services never see `req`/`res`.

### 2.2 Frontend layout

```
frontend/src
  api/           fetch client, typed-ish endpoint wrappers
  context/       AuthContext, ThemeContext
  components/    ui (Button, Field, Table, Stars…), layout, 3D scene
  pages/         auth/, admin/, user/, owner/
  hooks/         useDebounced, useList (query-state for tables)
  lib/           validation rules (mirror of the API), formatters
```

### 2.3 Cross-cutting conventions

- **Response envelope.** Success: `{ "data": …, "meta"?: { page, pageSize, total } }`. Failure: `{ "error": { "code", "message", "details"? } }`.
- **Error codes** are stable strings (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`). Clients branch on `code`, never on message text.
- **Pagination/sort/filter** are query params on every list: `page`, `pageSize` (≤100), `sortBy`, `order=asc|desc`, plus per-resource filters. Sort columns are mapped through a whitelist — user input is never interpolated into SQL.
- **All SQL is parameterised.** `LIKE` input is escaped.
- **Config** only via env (12-factor). `.env.example` is committed, `.env` is not.

---

## 3. Data model

```
users 1 ───── 0..1 stores        (stores.owner_id → users.id, UNIQUE, ON DELETE SET NULL)
users 1 ───── * ratings * ───── 1 stores
                 UNIQUE (user_id, store_id)
```

| Table | Columns |
|---|---|
| `users` | `id uuid pk`, `name varchar(60)` CHECK len 20–60, `email varchar(255)`, `password_hash text`, `address varchar(400)`, `role user_role` (`ADMIN`,`USER`,`STORE_OWNER`), `created_at`, `updated_at` |
| `stores` | `id uuid pk`, `name varchar(60)` CHECK len 20–60, `email varchar(255)`, `address varchar(400)`, `owner_id uuid null`, timestamps |
| `ratings` | `id uuid pk`, `user_id`, `store_id`, `rating smallint` CHECK 1–5, timestamps |

Indexes: unique on `lower(users.email)` and `lower(stores.email)` (case-insensitive uniqueness), `ratings(store_id)` for aggregates, `ratings(user_id)` for "my rating" joins, trigram-free `ILIKE` is fine at this scale (noted as a scaling item below).

Migrations are plain ordered `.sql` files applied by a ~40-line runner that records them in `schema_migrations` inside a transaction each. No ORM: the queries are aggregate-heavy and clearer as SQL.

---

## 4. API contract

All routes are prefixed `/api`. Auth = cookie `tally_token`.

### Auth
| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/auth/signup` | public | `name, email, address, password` → creates `USER`, logs in |
| POST | `/auth/login` | public | `email, password` |
| POST | `/auth/logout` | any | clears cookie |
| GET | `/auth/me` | any | current user |
| PATCH | `/auth/password` | any | `currentPassword, newPassword` |

### Admin (`ADMIN`)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | `{ users, stores, ratings }` |
| GET | `/admin/users` | filters `name,email,address,role`; sort `name,email,address,role,createdAt` |
| POST | `/admin/users` | `name,email,address,password,role` |
| GET | `/admin/users/:id` | includes `rating` when role is `STORE_OWNER` |
| GET | `/admin/stores` | filters `name,email,address`; sort `name,email,address,rating` |
| POST | `/admin/stores` | `name,email,address,ownerId?` |
| GET | `/admin/store-owners` | unassigned owners for the create-store form |

### Normal user (`USER`)
| Method | Path | Notes |
|---|---|---|
| GET | `/stores` | `q` matches name **or** address; sort `name,address,rating`; each row has `overallRating`, `ratingCount`, `myRating` |
| PUT | `/stores/:id/rating` | `{ rating: 1..5 }` — insert or update |

### Store owner (`STORE_OWNER`)
| Method | Path | Notes |
|---|---|---|
| GET | `/owner/dashboard` | store, `averageRating`, `ratingCount`, paged raters (sort `name,email,rating,ratedAt`) |

### Health
`GET /api/health` — liveness + DB ping, unauthenticated.

---

## 5. Security

| Threat | Control |
|---|---|
| Credential stuffing | `express-rate-limit` on `/auth/login` & `/auth/signup`; uniform "invalid email or password" message; constant-time compare path even when the email is unknown |
| Password storage | bcrypt, cost 12 (configurable; tests use 4) |
| Token theft via XSS | JWT lives in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie — JS cannot read it |
| CSRF | SameSite=Lax + JSON-only bodies (`Content-Type` enforced by `express.json`) + same-origin deployment |
| Privilege escalation | Role comes from the DB row, not the token claim; signup ignores any `role` field (schema is `.strict()`) |
| SQL injection | Parameterised queries; sort/filter columns whitelisted |
| Mass assignment | zod `.strict()` schemas strip nothing silently — unknown keys are rejected |
| Header hardening | `helmet`, `x-powered-by` off, body size limit 10kb |
| Info leakage | Central error handler: 5xx never returns internals; stack only in logs |

---

## 6. Testing strategy

Pyramid, weighted to where the risk is:

- **API integration (most coverage).** Vitest + Supertest against a real Postgres (`tally_test`, created by the compose init script). No DB mocks: the interesting bugs are in SQL (aggregates, upserts, constraints). Each suite truncates tables first.
  - auth: signup validation, duplicate email (case-insensitive), login, password change
  - RBAC matrix: every protected route × every role
  - ratings: upsert idempotency, range check, average maths, owner can't rate
  - lists: filters, sort whitelist, pagination bounds, LIKE-escape
- **Unit.** Pure helpers (pagination/sort builder, validation schemas).
- **Frontend.** Vitest + Testing Library for validation rules and the star-rating component; the critical path is covered end-to-end manually via the checklist in §8.
- **CI.** Lint → test (with a Postgres service container) → build, on every push/PR.

Definition of done for a change: tests added or updated, lint clean, docs touched if the contract moved.

---

## 7. Delivery plan

Conventional Commits, small PRs, `main` always green.

| Phase | Output |
|---|---|
| 0. Foundations | Repo, blueprint, tooling, compose, env |
| 1. Data | Migrations, seed, pool, migration runner |
| 2. API core | App skeleton, error handling, auth module |
| 3. API features | Admin, stores/ratings, owner modules |
| 4. API tests | Integration suite, CI |
| 5. Web foundations | Vite app, design tokens, UI kit, auth flow |
| 6. Web features | Admin, user, owner screens |
| 7. Polish | Motion, 3D hero, responsive pass, a11y pass |
| 8. Release | Docker images, README, final verification |

## 8. Manual acceptance checklist

- [ ] Sign up with each invalid field → inline error matching the rule
- [ ] Sign up → land on store list as `USER`
- [ ] Rate a store, reload, change the rating — overall average updates, only one row per user/store
- [ ] Search by name and by address
- [ ] Admin: dashboard counts match DB; create user/admin/store; filter + sort every table; open owner detail and see rating
- [ ] Owner: sees raters + average; cannot see other stores
- [ ] Change password; old password stops working
- [ ] Direct URL to a page of another role → redirected
- [ ] 360px, 768px, 1440px layouts

## 9. Scaling notes (not in v1)

- Replace `ILIKE '%x%'` with `pg_trgm` GIN indexes once stores > ~50k.
- If rating reads dominate, add `stores.rating_sum/rating_count` maintained by trigger, instead of aggregating per request.
- Move sessions to short-lived access + refresh tokens if mobile clients appear.

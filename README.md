# Tally

A store rating platform. One login for everyone; what you see depends on your role.

- **Customers** sign up, browse and search stores, and rate them 1–5 (rating again edits the previous one).
- **Store owners** see the average rating of their store and who rated it.
- **Administrators** manage users and stores, with a dashboard, filters and sortable tables.

Built with Express 5, PostgreSQL 16 and React 19. Design notes, API contract and decisions are in [docs/BLUEPRINT.md](docs/BLUEPRINT.md).

## Run it

### With Docker (everything)

```bash
cp .env.example .env          # then set JWT_SECRET to 32+ random characters
docker compose --profile app up -d --build
docker compose --profile app run --rm api npm run seed   # demo data (optional)
```

Open <http://localhost:8080>. nginx serves the SPA and proxies `/api` to the API, so there's no CORS in this setup.

### Local development

Only Postgres runs in Docker; the API and the web app run on your machine with hot reload.

```bash
cp .env.example .env
docker compose up -d db

cd backend  && npm install && npm run seed && npm run dev   # http://localhost:4000
cd frontend && npm install && npm run dev                    # http://localhost:5173
```

Vite proxies `/api` to the API, so cookies stay same-origin in dev too.

### Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@tally.test` | `Admin@12345` |
| Store owner | `marcus@brewhaus.test` | `Passw0rd!demo` |
| Customer | `shopper1@demo.test` | `Passw0rd!demo` |

`npm run seed -- --admin-only` creates just the admin, which is what you want outside of a demo.

## Tests

```bash
cd backend  && npm test    # integration tests against a real Postgres (tally_test)
cd frontend && npm test    # validation rules and components
```

The API suite needs the database from `docker compose up -d db`. Set `TEST_DATABASE_URL` to use a different one. CI (`.github/workflows/ci.yml`) runs lint, tests and the build for both apps.

## Layout

```
backend/    Express API — modules/{auth,admin,stores,owner}, db/migrations, tests
frontend/   React SPA — components/ui, pages/{auth,admin,user,owner}, styles
docs/       Blueprint: scope, architecture, data model, API, security, test plan
docker/     Postgres init script
```

## Validation rules

| Field | Rule |
|---|---|
| Name | 20–60 characters |
| Address | up to 400 characters |
| Password | 8–16 characters, at least one uppercase letter and one special character |
| Email | standard email format, unique (case-insensitive) |
| Rating | whole number 1–5 |

The API enforces these with zod, the forms mirror them for instant feedback, and the name/rating limits are also `CHECK` constraints in the database.

## Configuration

All via environment variables, see [.env.example](.env.example). The API refuses to start with a missing or short `JWT_SECRET`. Set `COOKIE_SECURE=true` when serving over HTTPS.

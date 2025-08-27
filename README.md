# BlogCMS

A full‑stack blogging platform monorepo with a NestJS + Prisma backend and a Next.js 15 (App Router) frontend.

- Backend: `backend/` (NestJS 11, Prisma 6, PostgreSQL)
- Frontend: `frontend/` (Next.js 15, React 19, Tailwind CSS 4)
- API base URL: `http://localhost:3001/api`
- Admin UI: `http://localhost:3000/admin` (login at `http://localhost:3000/login`)

## Requirements

- Node.js >= 20 (LTS recommended)
- npm (or pnpm/yarn) – examples use npm
- PostgreSQL >= 13
- Git

Note: Image processing uses `sharp`, which bundles dependencies for most platforms. No extra native setup is typically needed on Windows/macOS.

## Quick Start

1) Clone and open two terminals (backend and frontend):

```bash
# Terminal A (backend)
cd backend
cp .env.example .env  # create and edit DB and CORS settings
npm install

# Create DB schema (uses existing migrations)
npx prisma migrate dev

# (Optional) Seed an initial admin user
# In backend/.env set:
# SEED_ADMIN_EMAIL="admin@gmail.com"
# SEED_ADMIN_USERNAME="admin"
# SEED_ADMIN_PASSWORD="StrongPassword123"
npx prisma db seed

npm run start:dev  # http://localhost:3001 (API at /api, Swagger at /api/docs)
```

```bash
# Terminal B (frontend)
cd frontend
cp env.local.example .env.local  # set NEXT_PUBLIC_API_URL to http://localhost:3001/api
npm install
npm run dev  # http://localhost:3000
```

2) Log in to the Admin:

- Visit `http://localhost:3000/login`
- Use the credentials you seeded (e.g., `admin@gmail.com` / `StrongPassword123`)
- You’ll be redirected to `http://localhost:3000/admin`

## Environment Configuration

- Backend env file: `backend/.env` (copy from `.env.example`)
  - `DATABASE_URL` – PostgreSQL connection string
  - `PORT` – defaults to 3001
  - `CORS_ORIGINS` – comma‑separated list of allowed origins (default `http://localhost:3000`)
  - JWT: `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REMEMBER_EXPIRATION`
  - Seeding: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`
  - Optional security headers via `ENABLE_CSP` and `CSP_HEADER`
  - Optional upload limits: `UPLOAD_MAX_PIXELS`
  - Optional HttpOnly cookie support: `AUTH_COOKIE_*` (see `.env.example` for details)

- Frontend env file: `frontend/.env.local` (copy from `env.local.example`)
  - `NEXT_PUBLIC_API_URL` – e.g., `http://localhost:3001/api`
  - `NEXT_PUBLIC_FORCE_SECURE_COOKIES` – set true only when serving over HTTPS
  - `NEXT_PUBLIC_SEND_CREDENTIALS` – set true only if using HttpOnly cookies from backend with proper CORS

## Common Scripts

Backend (`backend/package.json`):

- `npm run start:dev` – start NestJS in watch mode
- `npm run build` / `npm run start:prod` – production build/start
- `npx prisma migrate dev` – apply migrations
- `npx prisma db seed` – run seed (creates admin when SEED_* are set)
- Swagger UI: `http://localhost:3001/api/docs`

Frontend (`frontend/package.json`):

- `npm run dev` – start Next.js dev server (Turbopack)
- `npm run build` / `npm start` – production build/start

## Project Layout

```
BlogCMS/
  backend/
    src/
      auth/, users/, posts/, categories/, tags/, comments/, settings/, upload/, newsletter/
      main.ts (CORS, global prefix /api, validation, Swagger)
    prisma/ (schema + migrations, seed.ts)
    .env.example
  frontend/
    src/app/ (App Router: public pages, /login, /admin/*)
    src/lib/api.ts (API client, interceptors, endpoints)
    env.local.example
```

## Production Build & Run

- Backend
  ```bash
  cd backend
  npm install
  npm run build
  NODE_ENV=production npm run start:prod
  ```

- Frontend
  ```bash
  cd frontend
  npm install
  npm run build
  npm start
  ```

Set the production envs accordingly and ensure the backend allows the deployed frontend origin via `CORS_ORIGINS`.

### Serving Uploads in Production

Uploads are written to the local `uploads/` directory and exposed under `/uploads` (see `backend/src/app.module.ts`). In production, ensure this directory is persisted and accessible (e.g., mount a volume in Docker or use shared storage).

## Troubleshooting

- CORS errors: ensure `CORS_ORIGINS` in backend `.env` includes the frontend origin.
- 401 redirects to /login: your session/token may be missing or expired; re‑login.
- Prisma errors: verify `DATABASE_URL`, run `npx prisma migrate dev`, and ensure the DB is reachable.
- Sharp/image upload errors: verify file type and size; check `UPLOAD_MAX_PIXELS` and backend logs.
- Cookie issues in cross‑site setups: require HTTPS and `SameSite=None; Secure` with proper backend cookie config.

## License

UNLICENSED (see `backend/package.json`).

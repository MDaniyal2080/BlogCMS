# BlogCMS Frontend Environment Setup

This project uses Next.js. Environment files are ignored by Git (see `.gitignore`), so commit the example file only.

- Create `/.env.local` in `frontend/my-app/` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

- You can copy the example file provided:

Windows PowerShell:
```powershell
Copy-Item env.local.example .env.local
```

- Ensure the backend is configured using `backend/.env` (see `backend/.env.example` for all required keys):
  - DATABASE_URL
  - JWT_SECRET
  - JWT_EXPIRATION
  - UPLOAD_DESTINATION
  - PORT (defaults to 3001)

Notes:
- `NEXT_PUBLIC_API_URL` must point to the backend base API path (includes `/api`).
- Static uploads are served from `http://<backend-host>:<port>/uploads`.
- Do not commit your real `.env.local`; commit updates to `env.local.example` instead.

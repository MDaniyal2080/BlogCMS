# BlogCMS – What this app does

BlogCMS is a full‑stack, production‑ready blogging platform. It provides an Admin UI to manage content and a public API/UI to read it.

- Backend: NestJS + Prisma + PostgreSQL (`backend/`)
- Frontend: Next.js (App Router) + React + Tailwind (`frontend/`)
- API: REST with JWT auth, Swagger docs at `/api/docs`

## Who it's for
- Teams or solo creators who want a simple, fast, self‑hosted blog/CMS
- Editors who draft, schedule, and publish posts
- Admins who manage users, settings, and taxonomy

## Key features
- Posts
  - Create, edit, delete, duplicate
  - Draft/Publish/Archive statuses, scheduling via `publishedAt`
  - Markdown content with preview (GitHub‑style)
  - SEO fields (meta title/description/keywords)
  - View count, related posts, previous/next navigation
  - Bulk actions (status updates, delete)
- Categories & Tags
  - CRUD categories and tags
  - Reorder categories
  - Merge tags and cleanup unused tags
- Comments
  - Public comment submission (honeypot anti‑spam)
  - Admin moderation: list, approve/unapprove, delete
  - Optional user email notifications (preferences)
- Users & Roles
  - Roles: `ADMIN`, `EDITOR`
  - Admin: manage users, roles, activation
  - Self‑service: profile, password, notification preferences, activity
- Media Uploads
  - Upload image, cover (auto‑crop 1200×630), avatar (auto‑crop 256×256)
  - File type/size validation; served from `/uploads`
- Settings
  - Global key/value settings with admin update endpoint
- Search & Discovery
  - Search posts, list by category or tag
  - Related posts endpoint
- Developer Experience
  - Swagger docs, global validation, security headers, CORS allowlist

## How it works (high level)
1. Editors/Administrators log into the Admin UI and manage content.
2. Content is stored in PostgreSQL via Prisma models (e.g., `Post`, `User`, `Category`, `Tag`, `Comment`, `Setting`).
3. Public readers consume content via the frontend (Next.js) using the REST API.
4. Admin endpoints are protected by JWT; role checks enforce `ADMIN` vs `EDITOR` abilities.
5. Image uploads are processed (resize/crop/validate) and served statically from `/uploads`.

## Roles & permissions
- `ADMIN`
  - Full access to users, tags cleanup, settings, comments moderation, and all content operations
- `EDITOR`
  - Create/edit/publish posts, manage categories/tags (no user/setting admin)

## Architecture overview
- `backend/`
  - NestJS modules: `auth`, `users`, `posts`, `categories`, `tags`, `comments`, `settings`, `upload`, `newsletter`
  - CORS allowlist, security headers, global validation, Swagger @ `/api/docs`
- `frontend/`
  - Next.js App Router pages for public site and `/admin` area
  - API client for calling the backend with token/cookie support

## Data model (essentials)
- `User`: account, role, profile, activity, notification preferences
- `Post`: content, status, scheduling, SEO, relations to categories/tags, metrics
- `Category` / `Tag`: taxonomy for organizing posts
- `Comment`: post comments with approval workflow
- `Setting`: configurable key/value pairs

## What you can do with BlogCMS
- Draft a post with markdown and preview it
- Schedule publishing by setting `publishedAt`
- Upload a cover image and avatar
- Organize posts with categories and tags
- Moderate comments from readers
- Manage users and assign roles
- Search posts and show related/prev‑next on the post page

## Links
- Project README (setup, scripts, envs): `./README.md`
- REST API reference: `./backend/API_DOCS.md`
- Swagger UI (when backend is running): `/api/docs`

## Notes
- JWT tokens can also be set as HttpOnly cookies (optional env flags)
- Default uploads are local; ensure persistence in production
- Extendable via new NestJS modules and Next.js routes/components

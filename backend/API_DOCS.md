# BlogCMS API Reference

Base URL: `/api`

Swagger UI: `/api/docs`

Auth: Bearer JWT (see `main.ts` adds `.addBearerAuth()`), with optional HttpOnly cookie set on login depending on env (see `auth.controller.ts`).

Static files: `/uploads/**` served by `ServeStaticModule`.

---

## Auth

Controller: `backend/src/auth/auth.controller.ts`

- POST `/api/auth/register`
  - Summary: Register a new user
  - Auth: None
  - Body: `RegisterDto`
  - Returns: Result of `AuthService.register(...)`

- POST `/api/auth/login`
  - Summary: Login user
  - Auth: None
  - Body: `LoginDto`
  - Returns: `{ access_token: string }`
  - Notes: Optionally sets HttpOnly cookie with the token if `AUTH_COOKIE_ENABLED=true`.

- POST `/api/auth/logout`
  - Summary: Logout (clear auth cookie if enabled)
  - Auth: None
  - Returns: `{ success: true }`

Cookie env vars (optional):
- `AUTH_COOKIE_ENABLED`, `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_REMEMBER_MAX_AGE_MS`

---

## App

Controller: `backend/src/app.controller.ts`

- GET `/api`
  - Summary: Health/hello
  - Auth: None
  - Returns: string

---

## Categories

Controller: `backend/src/categories/categories.controller.ts`

- GET `/api/categories`
  - Summary: List categories
  - Auth: None

- GET `/api/categories/:id`
  - Summary: Get category by id
  - Auth: None

- POST `/api/categories`
  - Summary: Create category
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `CreateCategoryDto`

- PUT `/api/categories/:id`
  - Summary: Update category
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `UpdateCategoryDto`

- POST `/api/categories/reorder`
  - Summary: Reorder categories
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `{ ids: string[] }`

- DELETE `/api/categories/:id`
  - Summary: Delete category
  - Auth: JWT
  - Roles: ADMIN

---

## Comments

Controller: `backend/src/comments/comments.controller.ts`

- GET `/api/comments/by-post/:postId`
  - Summary: List approved comments for a post
  - Auth: None
  - Query: `limit?: number`, `offset?: number`

- POST `/api/comments`
  - Summary: Create a comment
  - Auth: None
  - Body: `CreateCommentDto` (includes honeypot)

- GET `/api/comments/admin`
  - Summary: Admin: list comments with filters
  - Auth: JWT
  - Roles: ADMIN
  - Query: `postId?: string`, `approved?: boolean`, `limit?: number`, `offset?: number`

- PATCH `/api/comments/:id/approve`
  - Summary: Admin: approve/unapprove a comment
  - Auth: JWT
  - Roles: ADMIN
  - Body: `UpdateCommentApprovalDto`

- DELETE `/api/comments/:id`
  - Summary: Admin: delete a comment
  - Auth: JWT
  - Roles: ADMIN

---

## Newsletter

Controller: `backend/src/newsletter/newsletter.controller.ts`

- POST `/api/newsletter/subscribe`
  - Summary: Subscribe an email to the newsletter (public)
  - Auth: None
  - Body: `SubscribeDto` (includes honeypot)

---

## Posts

Controller: `backend/src/posts/posts.controller.ts`

- GET `/api/posts`
  - Summary: List posts
  - Auth: None
  - Query: generic filters supported by service

- GET `/api/posts/slug/:slug`
  - Summary: Get a post by slug
  - Auth: None

- GET `/api/posts/search`
  - Summary: Search posts
  - Auth: None
  - Query: `q: string`

- GET `/api/posts/stats`
  - Summary: Get posts stats for admin dashboard
  - Auth: JWT
  - Roles: ADMIN, EDITOR

- GET `/api/posts/scheduled`
  - Summary: Admin: list upcoming scheduled posts
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Query: `limit?: number`, `from?: string`, `to?: string`

- GET `/api/posts/category/:slug`
  - Summary: List posts by category slug
  - Auth: None

- GET `/api/posts/tag/:slug`
  - Summary: List posts by tag slug
  - Auth: None

- POST `/api/posts/:id/view`
  - Summary: Increment view count for a post
  - Auth: None

- GET `/api/posts/:id/related`
  - Summary: Get related posts by categories/tags
  - Auth: None
  - Query: `limit?: number` (default 3, min 1, max 10)

- GET `/api/posts/:id/prev-next`
  - Summary: Get previous and next posts by publish date
  - Auth: None

- GET `/api/posts/:id`
  - Summary: Get a post by id
  - Auth: None

- POST `/api/posts`
  - Summary: Create a post
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `CreatePostDto`

- PUT `/api/posts/:id`
  - Summary: Update a post
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `UpdatePostDto`

- POST `/api/posts/:id/duplicate`
  - Summary: Duplicate a post (creates a draft copy)
  - Auth: JWT
  - Roles: ADMIN, EDITOR

- DELETE `/api/posts/:id`
  - Summary: Delete a post
  - Auth: JWT
  - Roles: ADMIN, EDITOR

- POST `/api/posts/bulk/status`
  - Summary: Bulk update status for posts
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `{ ids: string[]; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; publishedAt?: string }`

- POST `/api/posts/bulk/delete`
  - Summary: Bulk delete posts
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `{ ids: string[] }`

---

## Settings

Controller: `backend/src/settings/settings.controller.ts`

- GET `/api/settings`
  - Summary: List all settings
  - Auth: None

- PUT `/api/settings/:key`
  - Summary: Update a setting by key
  - Auth: JWT
  - Roles: ADMIN
  - Body: `UpdateSettingDto`

---

## Tags

Controller: `backend/src/tags/tags.controller.ts`

- GET `/api/tags`
  - Summary: List all tags (optional search)
  - Auth: None
  - Query: `q?: string`

- GET `/api/tags/:id`
  - Summary: Get tag by id
  - Auth: None

- POST `/api/tags`
  - Summary: Create tag
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `CreateTagDto`

- POST `/api/tags/merge`
  - Summary: Merge source tags into a target tag
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `MergeTagsDto`

- POST `/api/tags/cleanup-unused`
  - Summary: Delete tags that are not used by any posts
  - Auth: JWT
  - Roles: ADMIN

- PUT `/api/tags/:id`
  - Summary: Update tag
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Body: `UpdateTagDto`

- DELETE `/api/tags/:id`
  - Summary: Delete tag
  - Auth: JWT
  - Roles: ADMIN

---

## Upload

Controller: `backend/src/upload/upload.controller.ts`

- POST `/api/upload/image`
  - Summary: Upload an image
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Consumes: `multipart/form-data`
  - Body: file field `file` (binary)
  - Limits: file size <= 8MB; types: jpeg, png, gif, webp, avif

- POST `/api/upload/cover`
  - Summary: Upload a cover image (auto-cropped to 1200x630)
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Consumes: `multipart/form-data`
  - Body: file field `file` (binary)
  - Limits: file size <= 8MB; types: jpeg, png, gif, webp, avif

- POST `/api/upload/avatar`
  - Summary: Upload an avatar image (auto-cropped to 256x256)
  - Auth: JWT
  - Roles: ADMIN, EDITOR
  - Consumes: `multipart/form-data`
  - Body: file field `file` (binary)
  - Limits: file size <= 5MB; types: jpeg, png, gif, webp, avif

---

## Users

Controller: `backend/src/users/users.controller.ts`

- GET `/api/users`
  - Summary: List users
  - Auth: JWT
  - Roles: ADMIN

- GET `/api/users/me`
  - Summary: Get current user profile
  - Auth: JWT

- PUT `/api/users/me`
  - Summary: Update current user profile
  - Auth: JWT
  - Body: `UpdateProfileDto`

- PUT `/api/users/me/password`
  - Summary: Change current user password
  - Auth: JWT
  - Body: `ChangePasswordDto`

- GET `/api/users/me/notifications`
  - Summary: Get current user notification preferences
  - Auth: JWT

- PUT `/api/users/me/notifications`
  - Summary: Update current user notification preferences
  - Auth: JWT
  - Body: `UpdateNotificationsDto`

- GET `/api/users/:id`
  - Summary: Get user by id
  - Auth: JWT
  - Roles: ADMIN

- POST `/api/users`
  - Summary: Create user
  - Auth: JWT
  - Roles: ADMIN
  - Body: `CreateUserDto`

- PUT `/api/users/:id`
  - Summary: Update user
  - Auth: JWT
  - Roles: ADMIN
  - Body: `UpdateUserDto`

- DELETE `/api/users/:id`
  - Summary: Delete user
  - Auth: JWT
  - Roles: ADMIN

---

# DTO Schemas

Below are request payload schemas with validation (from class-validator).

- `auth/dto/LoginDto`
  - `email: string` (email)
  - `password: string` (min 6)
  - `rememberMe?: boolean`

- `auth/dto/RegisterDto`
  - `email: string` (email)
  - `username: string` (min 3)
  - `password: string` (min 8, must include upper, lower, number, special)
  - `firstName?: string`
  - `lastName?: string`

- `categories/dto/CreateCategoryDto`
  - `name: string` (required, max 100)
  - `description?: string` (max 500)
  - `color?: string` (max 30)

- `categories/dto/UpdateCategoryDto`
  - `name?: string` (max 100)
  - `slug?: string` (max 120, slug regex)
  - `description?: string` (max 500)
  - `color?: string` (max 30)

- `comments/dto/CreateCommentDto`
  - `postId: string`
  - `authorName?: string` (max 100)
  - `authorEmail?: string` (email, max 200)
  - `content: string` (max 5000)
  - `honeypot?: string` (must be absent/empty; max length 0)

- `comments/dto/UpdateCommentApprovalDto`
  - `approved: boolean`

- `newsletter/dto/SubscribeDto`
  - `email: string` (email)
  - `honeypot?: string`

- `posts/dto/CreatePostDto`
  - `title: string` (max 200)
  - `excerpt?: string` (max 500)
  - `content: string`
  - `slug?: string`
  - `featuredImage?: string`
  - `categoryId?: string`
  - `categoryIds?: string[]`
  - `tagIds?: string[]`
  - `published?: boolean`
  - `publishedAt?: string`
  - `authorId?: string` (set from current user on create)
  - `markdown?: string`
  - `featured?: boolean`
  - `metaTitle?: string`
  - `metaDescription?: string`
  - `metaKeywords?: string`

- `posts/dto/UpdatePostDto`
  - Same fields optional, plus:
  - `status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'`

- `settings/dto/UpdateSettingDto`
  - `value: string`
  - `type?: string`

- `tags/dto/CreateTagDto`
  - `name: string` (max 50)

- `tags/dto/UpdateTagDto`
  - `name?: string` (max 50)

- `tags/dto/MergeTagsDto`
  - `sourceIds: string[]` (non-empty)
  - `targetId: string`

- `users/dto/CreateUserDto`
  - `email: string` (email)
  - `username: string` (min 3)
  - `password: string` (min 8, strong)
  - `firstName?: string`
  - `lastName?: string`
  - `role?: 'ADMIN' | 'EDITOR'`

- `users/dto/UpdateUserDto` (extends Partial<CreateUserDto>)
  - `isActive?: boolean`
  - `avatar?: string`

- `users/dto/ChangePasswordDto`
  - `currentPassword: string`
  - `newPassword: string` (min 8, strong)

- `users/dto/UpdateProfileDto`
  - `email?: string` (email)
  - `firstName?: string`
  - `lastName?: string`
  - `bio?: string` (max 1000)
  - `avatar?: string`

- `users/dto/UpdateNotificationsDto`
  - `emailOnComments?: boolean`
  - `emailOnMentions?: boolean`
  - `newsletter?: boolean`

---

# Auth & Roles

- Roles enum: `AppRoleEnum` in `src/common/types/roles.ts` → `ADMIN`, `EDITOR`
- Guards:
  - `JwtAuthGuard` for JWT auth
  - `RolesGuard` with `@Roles(...roles)` for RBAC

---

# Models (Prisma)

See `backend/prisma/schema.prisma`. Responses generally return entities shaped by these models:

- `User`: `id`, `email`, `username`, `firstName?`, `lastName?`, `bio?`, `avatar?`, `role`, `isActive`, `createdAt`, `updatedAt`, `lastLoginAt?`
- `Post`: `id`, `title`, `slug`, `excerpt?`, `content`, `markdown`, `coverImage?`, `status`, `featured`, `viewCount`, `publishedAt?`, timestamps, `authorId`, relations to categories/tags/comments, SEO fields
- `Category`: `id`, `name`, `slug`, `description?`, `color?`, timestamps
- `Tag`: `id`, `name`, `slug`, timestamps
- `Comment`: `id`, `postId`, `authorName?`, `authorEmail?`, `content`, `approved`, timestamps
- `Setting`: `id`, `key`, `value`, `type`
- `ActivityLog`: `id`, `userId`, `action`, `metadata?`, `createdAt`
- `NotificationPreference`: `id`, `userId`, `emailOnComments`, `emailOnMentions`, `newsletter`, timestamps

Note: Services may join/shape responses; the above lists represent minimum fields from the DB models.

---

# General

- Global prefix: `api` (see `main.ts`)
- CORS: allowlist from env (`CORS_ORIGINS`, `FRONTEND_ORIGIN`, `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`), credentials enabled
- Validation: Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`

For interactive docs and try-it-out, open Swagger at `/api/docs` while the server is running.

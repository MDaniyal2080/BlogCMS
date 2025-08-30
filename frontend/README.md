This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Testing

This project uses Vitest for unit tests.

Install dependencies and run tests:

```bash
npm install
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Notes:

- Tests are colocated under `src/**/*.{test,spec}.{ts,tsx}`.
- Path alias `@/* -> src/*` is configured in `vitest.config.ts`.
- Asset URL helper tests live in `src/lib/assetUrl.test.ts` and cover `normalizeAssetPath()`, `apiBaseFromRaw()`, `assetUrlFromApiBase()`, and `assetUrl()`.

## Asset URLs

All image/asset URLs must be resolved via the shared helpers to avoid manual origin concatenation:

- Server and shared code: use `assetUrl()` from `src/lib/assetUrl.ts`.
- Client React components: use `useSettings().assetUrl()` from `src/components/public/SettingsContext.tsx`.

Notes:

- These helpers keep absolute `http(s)`, protocol-relative `//`, and `data:` URLs as-is.
- Relative paths like `uploads/x.png` become `/uploads/x.png`.
- Legacy `/api/uploads/...` is normalized to `/uploads/...`.
- When `NEXT_PUBLIC_API_URL` is empty in production builds, helpers return relative paths, which is safe for assets served by the same origin.

# Flight Management PWA

Production-grade flight booking and management web application built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, Zustand, and next-pwa.

## Features

- Supabase Auth login and signup
- Flight search and result browsing
- Visual seat selection with optimistic UI
- Booking confirmation with PNR output
- My bookings dashboard with cancel and reschedule paths
- Realtime seat availability sync
- PWA installability and offline fallback

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Supabase PostgreSQL, Auth, Realtime
- Zustand with persist middleware
- next-pwa

## Project Structure

- `src/app` - route handlers and pages
- `src/components` - reusable UI and feature components
- `src/lib` - environment, utilities, Supabase clients, mock data
- `src/services` - flight and booking data access
- `src/store` - Zustand state slices
- `src/hooks` - realtime hooks
- `src/types` - shared TypeScript contracts
- `supabase/migrations` - schema and seed migrations
- `scripts/seed.ts` - local seed helper for Supabase service role runs

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the app locally:

```bash
npm run dev
```

4. Apply the SQL migrations in `supabase/migrations` to your Supabase project.
5. Seed local/dev data after setting `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run db:seed
```

6. Use the seeded demo account for testing:

```text
demo@flight.app
DemoFlight123!
```

## Architecture Decisions

- Server components render route shells and data-first pages.
- Client components are reserved for forms, realtime subscriptions, and transient UI state.
- Zustand persists search flow state and only the session token for user state.
- Passport numbers stay in local component state and are never written to persisted storage.
- Booking and cancellation flows are centralized in service functions that mirror Supabase RPCs.

## Tradeoffs

- The app includes mock-backed fallbacks so the UI remains usable without Supabase env vars.
- The SQL RPCs are production-oriented, but the local demo path still works with the fallback data.
- Seat tooltips use native `title` behavior to stay light and touch-friendly on mobile.

## Screenshots

Add screenshots for:

- Search page
- Results page
- Seat selection page
- Booking confirmation
- My bookings dashboard

## Deployment

1. Provision a Supabase project.
2. Apply the SQL migrations.
3. Set environment variables in your host.
4. Build with `npm run build`.
5. Deploy to Vercel or any Node-compatible platform.

## Lighthouse PWA Checklist

- Manifest is present.
- Offline fallback page is available.
- Install prompt is shown in supported browsers.
- Static assets are cached with CacheFirst through `next-pwa`.
- Flight search requests can use stale-while-revalidate behavior through the service worker runtime strategy.
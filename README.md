# Supajump

Supajump is a multitenant starter kit for building SaaS applications with [Supabase](https://supabase.com) and [Next.js](https://nextjs.org). It provides a ready-to-run database schema, authentication flows and example UI so you can jump straight into product development.

## Features

- **Next.js App Router** with React Server Components
- **Supabase integration** for client and server helpers
- **Multi-tenant schema** including organizations, teams and posts
- **Role based access control** using Supabase RLS and seeded roles
- **Query helpers** exposed via the `api` object

## Getting Started

1. Install dependencies
   ```bash
   pnpm install
   ```
2. Start Supabase locally (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)) and apply migrations/seed data
   ```bash
   supabase start    # or `supabase db reset`
   ```
3. Create `.env.local` and set your Supabase credentials
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Run the Next.js development server
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Data Access Helpers

Query functions are grouped under the `api` object. For example:

```ts
import { api } from '@/queries'
const posts = await api.posts.getAll(supabase, orgId, teamId)
const org = await api.organizations.getById(supabase, orgId)
```

This replaces the previous flat function imports.

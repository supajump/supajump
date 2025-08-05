# Supajump

Supajump is a multitenant starter kit for building SaaS applications with [Supabase](https://supabase.com) and [Next.js](https://nextjs.org). It provides a ready-to-run database schema, authentication flows and example UI so you can jump straight into product development.

This is a [Turborepo](https://turbo.build/repo) monorepo, allowing you to scale with multiple apps and shared packages.

## Features

- **Turborepo Monorepo** for scalable app and package management
- **Next.js App Router** with React Server Components
- **Supabase integration** for client and server helpers
- **Multi-tenant schema** including organizations, teams and posts
- **Dynamic role-based access control** with flexible permissions stored in database
- **Query helpers** exposed via the `api` object
- **CLI tool** for quick project scaffolding

## Project Structure

```
.
├── apps/
│   └── app/                    # Next.js application
├── packages/
│   └── create-supajump-app/    # CLI for scaffolding new projects
├── supabase/                   # Database schemas and migrations
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # Workspace configuration
```

## Quick Start

### Using the CLI (Recommended)

```bash
npx @supajump/create-app my-app
# or
pnpm create @supajump/create-app my-app
# or
yarn create @supajump/create-app my-app
```

The CLI will:
- Prompt for your preferred package manager
- Create a new project with the Supajump template
- Set up environment files
- Optionally initialize git
- Optionally install dependencies

### Manual Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/supajump.git my-app
   cd my-app
   ```
2. Install dependencies
   ```bash
   pnpm install
   ```
3. Start Supabase locally (requires the [Supabase CLI](https://supabase.com/docs/guides/cli))
   ```bash
   supabase start
   ```
4. Set up environment variables
   ```bash
   cd apps/app
   cp .env.example .env.local
   ```
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Run the development server
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Monorepo Commands

```bash
# From root directory
pnpm dev              # Start all apps in development mode
pnpm build            # Build all apps and packages
pnpm lint             # Lint all apps and packages
pnpm format           # Format code with Prettier

# Run commands for specific apps/packages
pnpm --filter @supajump/app dev     # Run only the Next.js app
pnpm --filter @supajump/app build   # Build only the Next.js app

# Database commands (from root)
pnpm db:gen:types     # Generate TypeScript types from Supabase schema
```

## Data Access Helpers

Query functions are grouped under the `api` object in the Next.js app. For example:

```ts
import { api } from '@/queries'
const posts = await api.posts.getAll(supabase, orgId, teamId)
const org = await api.organizations.getById(supabase, orgId)
```

This replaces the previous flat function imports.

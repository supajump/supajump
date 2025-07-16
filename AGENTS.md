# Guidance for Codex Agents

This is a Turborepo monorepo containing a Next.js SaaS starter that integrates Supabase. The main application lives under `apps/app/`.

## Repository layout

### Monorepo Structure
- `apps/app/` – The main Next.js application
- `packages/` – Shared packages (ready for future additions)
- `supabase/` – Database schemas, migrations and local configuration
- `turbo.json` – Turborepo configuration
- `pnpm-workspace.yaml` – PNPM workspace configuration

### Next.js App Structure (`apps/app/`)
- `src/app` – Next.js App Router pages and layouts
- `src/components` – Shared React components. Primitive UI elements live in `src/components/ui`
- `src/queries` – Data access helpers grouped under the exported `api` object. Each file (e.g. `posts.ts`, `organizations.ts`) exposes CRUD style functions. `entities.ts` and `query-factory.ts` provide typed helpers for building queries
- `src/hooks` – React hooks that usually wrap React Query for fetching data
- `src/lib` – Miscellaneous utilities including Supabase clients and helpers
- `src/features` – Feature-based modules

For easy scalability and maintenance, organize most of the code within the features folder. Each feature folder should contain code specific to that feature, keeping things neatly separated. This approach helps prevent mixing feature-related code with shared components, making it simpler to manage and maintain the codebase compared to having many files in a flat folder structure.


## Development notes
- Use **pnpm** for all Node scripts
- Install dependencies with `pnpm install` from the root directory
- Run the development server with `pnpm dev` from root (starts all apps)
- To run only the Next.js app: `pnpm --filter @supajump/app dev`
- Start Supabase locally via the CLI (`supabase start`). See `README.md` for setup instructions

## Monorepo Commands
```bash
# From root directory
pnpm dev              # Start all apps
pnpm build            # Build all apps and packages
pnpm lint             # Lint entire monorepo
pnpm format           # Format with Prettier

# App-specific commands
pnpm --filter @supajump/app dev     # Run only Next.js app
pnpm --filter @supajump/app build   # Build only Next.js app
pnpm --filter @supajump/app lint    # Lint only Next.js app

# Database
pnpm db:gen:types     # Generate TypeScript types from Supabase
```

## Programmatic checks
- Always run `pnpm lint` from root before committing to ensure ESLint passes across the monorepo
- Turborepo will cache lint results for unchanged packages

## Style
- The project uses TypeScript and the Next.js ESLint configuration
- Formatting is handled by Prettier (config in app's package.json)
- Keep commit messages short and descriptive
- When adding new packages, follow the naming convention: `@supajump/package-name`

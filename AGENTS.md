# Guidance for Codex Agents

This repo contains a Next.js SaaS starter that integrates Supabase.  The main source code lives under `src/`.

## Repository layout
- `src/app` – Next.js App Router pages and layouts
- `src/components` – shared React components. Primitive UI elements live in `src/components/ui`.
- `src/queries` – data access helpers grouped under the exported `api` object.  Each file (e.g. `posts.ts`, `organizations.ts`) exposes CRUD style functions.  `entities.ts` and `query-factory.ts` provide typed helpers for building queries.
- `src/hooks` – React hooks that usually wrap React Query for fetching data.
- `src/lib` – miscellaneous utilities including Supabase clients and helpers.
- `supabase/` – database schema, migrations and local configuration.
- `src/features` - feature based modules
For easy scalability and maintenance, organize most of the code within the features folder. Each feature folder should contain code specific to that feature, keeping things neatly separated. This approach helps prevent mixing feature-related code with shared components, making it simpler to manage and maintain the codebase compared to having many files in a flat folder structure. By adopting this method, you can enhance collaboration, readability, and scalability in the application's architecture.


## Development notes
- Use **pnpm** for all Node scripts.
- Install dependencies with `pnpm install`.
- Run the development server with `pnpm dev` and start Supabase locally via the CLI (`supabase start`).  See `README.md` for setup instructions.

## Programmatic checks
- Always run `pnpm lint` before committing to ensure ESLint passes.

## Style
- The project uses TypeScript and the Next.js ESLint configuration.  Formatting is handled by Prettier using `prettier.config.js`.
- Keep commit messages short and descriptive.

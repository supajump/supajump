# Guidance for Codex Agents

This is a Turborepo monorepo containing a Next.js SaaS starter that integrates Supabase. The main application lives under `apps/app/`.

## Repository layout

### Monorepo Structure
- `apps/app/` – The main Next.js application
- `packages/create-supajump-app/` – CLI tool for scaffolding new Supajump projects
- `packages/` – Shared packages (ready for future additions)
- `supabase/` – Database schemas, migrations and local configuration
- `turbo.json` – Turborepo configuration
- `pnpm-workspace.yaml` – PNPM workspace configuration

### Next.js App Structure (`apps/app/`)
- `src/app` – Next.js App Router pages and layouts
- `src/components` – Shared React components. Primitive UI elements live in `src/components/ui`
- `src/queries` – Data access helpers grouped under the exported `api` object. Each file (e.g. `posts.ts`, `organizations.ts`) exposes CRUD style functions
- `src/queries/keys.ts` – Tanstack Query cache keys for proper invalidation
- `src/hooks` – React hooks that usually wrap React Query for fetching data
- `src/lib` – Miscellaneous utilities including Supabase clients and helpers
- `src/features` – Feature-based modules (e.g., `posts/` contains all posts-related components, hooks, and queries)

For easy scalability and maintenance, organize most of the code within the features folder. Each feature folder should contain code specific to that feature, keeping things neatly separated. This approach helps prevent mixing feature-related code with shared components, making it simpler to manage and maintain the codebase compared to having many files in a flat folder structure.

### Feature Organization Example
```
src/features/posts/
├── components...     # Feature-specific components
├── hooks/           # Feature-specific hooks
│   └── use-posts.ts
└── queries/         # Feature-specific queries
    └── posts.ts
```

## Data Fetching Pattern with Tanstack Query

The project uses Tanstack Query for data fetching, caching, and state management. Follow these patterns:

### Server Components (RSC) with Prefetching
In `page.tsx` files, prefetch data on the server and pass it to client components:

```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { api } from '@/queries'
import { postsKeys } from '@/queries/keys'

export default async function Page({ params }) {
  const { org_id, team_id } = await params
  const supabase = await createClient()
  
  // Prefetch data on server
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(org_id, team_id),
    queryFn: () => api.posts.getAll(supabase, org_id, team_id),
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent orgId={org_id} teamId={team_id} />
    </HydrationBoundary>
  )
}
```

### Client Components with Custom Hooks
Create custom hooks in `features/[feature]/hooks/`:

```typescript
// features/posts/hooks/use-posts.ts
export function usePosts(orgId: string, teamId: string) {
  const supabase = createClient()
  
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  })
}

// Mutation hook with cache invalidation
export function useCreatePost(orgId: string, teamId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: (data) => api.posts.create(supabase, data),
    onSuccess: () => {
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: postsKeys.list(orgId, teamId) 
      })
      toast.success('Post created')
    },
  })
}
```

### Query Keys
Define query keys in `/src/queries/keys.ts` for consistent cache management:

```typescript
export const postsKeys = {
  all: () => ['posts'] as const,
  list: (orgId: string, teamId: string) => ['posts', orgId, teamId] as const,
  detail: (postId: string) => ['post', postId] as const,
}
```

### Loading States
Use skeleton components instead of spinners for better perceived performance:

```typescript
// Create skeleton components that match your UI
export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// Use in components
if (isLoading) return <TableSkeleton />
```

### Key Points
- Always prefetch in server components when possible
- Use `HydrationBoundary` to pass server state to client
- Create feature-specific hooks for data fetching
- Use query keys for proper cache invalidation
- Use skeleton components for loading states (not spinners)
- Add `eslint-disable-next-line @tanstack/query/exhaustive-deps` for query keys


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

## CLI Development

The `create-supajump-app` CLI is located in `packages/create-supajump-app/`. To work on the CLI:

```bash
# From the CLI package directory
cd packages/create-supajump-app
pnpm dev      # Watch mode for development
pnpm build    # Build the CLI
npm link      # Link globally for testing

# Test the CLI
create-supajump-app test-project
```

The CLI uses:
- `@clack/prompts` for interactive prompts
- `commander` for argument parsing
- `chalk` for terminal colors
- `execa` for running shell commands

## Database Patterns

### Multi-Tenant Data Model
The application implements a hierarchical multi-tenant structure:
- **Organizations**: Top-level tenant containers
- **Teams**: Workspaces within organizations  
- **Users**: Can belong to multiple organizations and teams
- **Roles & Permissions**: Dynamic RBAC system with flexible permissions

### Row Level Security (RLS) Policies
For tables following the multi-tenant pattern (with `org_id`, `team_id`, `owner_id` columns), use the simplified RLS pattern:

```sql
-- Replace <table_name> with your actual table name

-- SELECT policy
CREATE POLICY "rls_<table_name>_select" ON <table_name> 
FOR SELECT TO authenticated USING (
  supajump.has_permission('<table_name>', 'view', org_id, team_id, owner_id)
);

-- INSERT policy  
CREATE POLICY "rls_<table_name>_insert" ON <table_name>
FOR INSERT TO authenticated WITH CHECK (
  supajump.has_permission('<table_name>', 'create', org_id, team_id, owner_id)
);

-- UPDATE policy
CREATE POLICY "rls_<table_name>_update" ON <table_name>
FOR UPDATE TO authenticated WITH CHECK (
  supajump.has_permission('<table_name>', 'edit', org_id, team_id, owner_id)
);

-- DELETE policy
CREATE POLICY "rls_<table_name>_delete" ON <table_name>
FOR DELETE TO authenticated WITH CHECK (
  supajump.has_permission('<table_name>', 'delete', org_id, team_id, owner_id)
);
```

The `has_permission` helper function automatically handles:
- Organization and team owner bypass checks
- Ownership checks only when an explicit `scope = 'own'` permission is granted
- Role-based permission checks through the `user_permissions_view`
- Permission scope handling (`all` vs `own`)

### Permission Checks in Application Code
Use RPC functions to check permissions in your UI:

```typescript
// Check org-level permission
const canEdit = await supabase.rpc('has_org_permission', {
  _org_id: orgId,
  _resource: 'posts',
  _action: 'edit'
})

// Check team-level permission  
const canDelete = await supabase.rpc('has_team_permission', {
  _team_id: teamId,
  _resource: 'posts', 
  _action: 'delete'
})
```

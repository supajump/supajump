# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supajump is a multi-tenant SaaS starter kit built with Next.js 15 and Supabase. It implements a hierarchical structure: Organizations → Teams → Users, with role-based access control and Row Level Security.

This is a Turborepo monorepo with the following structure:
- `/apps/app` - The main Next.js application
- `/packages/create-supajump-app` - CLI tool for creating new Supajump projects
- `/packages/*` - Shared packages (to be added as needed)

## Essential Commands

```bash
# Development (from root)
pnpm dev           # Start all apps in dev mode
pnpm dev --filter @supajump/app  # Start only the Next.js app
supabase start     # Start local Supabase instance (required for development)

# Building and Testing (from root)
pnpm build         # Build all apps and packages
pnpm lint          # Run ESLint across the monorepo (ALWAYS run before committing)

# Database Management
pnpm db:gen:types  # Generate TypeScript types from Supabase schema
supabase db push   # Push migrations to local database
supabase db reset  # Reset and reseed local database
```

## Architecture & Code Organization

### Data Access Pattern with Tanstack Query

All database queries are centralized in `/apps/app/src/queries/index.ts` and exposed via the `api` object. We use Tanstack Query for data fetching, caching, and state management.

#### Server Components (RSC) Pattern with Prefetching:
```typescript
// In page.tsx (Server Component)
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { api } from '@/queries'
import { postsKeys } from '@/queries/keys' // Query keys for cache management

export default async function Page({ params }) {
  const supabase = await createClient()
  
  // Prefetch data on the server
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  })
  
  // Wrap client components with HydrationBoundary
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsTable orgId={orgId} teamId={teamId} />
    </HydrationBoundary>
  )
}
```

#### Client Components Pattern with Hooks:
```typescript
// Create a custom hook in features/[feature]/hooks/
export function usePosts(orgId: string, teamId: string) {
  const supabase = createClient()
  
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  })
}

// Use in client component
function PostsTable({ orgId, teamId }) {
  const { data: posts, isLoading } = usePosts(orgId, teamId)
  
  if (isLoading) return <PostsTableSkeleton />
  // ... render posts
}
```

#### Mutations with Cache Invalidation:
```typescript
export function useCreatePost(orgId: string, teamId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: (data) => api.posts.create(supabase, data),
    onSuccess: () => {
      // Invalidate and refetch posts list
      queryClient.invalidateQueries({ 
        queryKey: postsKeys.list(orgId, teamId) 
      })
      toast.success('Post created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create post: ' + error.message)
    },
  })
}
```

#### Query Keys Management:
Define query keys in `/apps/app/src/queries/keys.ts`:
```typescript
export const postsKeys = {
  all: () => ['posts'] as const,
  list: (orgId: string, teamId: string) => ['posts', orgId, teamId] as const,
  detail: (postId: string) => ['post', postId] as const,
}
```

#### Loading States with Skeletons:
Use skeleton components for loading states instead of spinners:
```typescript
// Create a skeleton component matching your UI structure
export function PostsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><Skeleton className="h-4 w-20" /></TableHead>
          {/* ... more headers */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            {/* ... more cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Use in your component
if (isLoading) return <PostsTableSkeleton />
```

### Feature-Based Organization
New features should be added to `/apps/app/src/features/[feature-name]/`:
- Components specific to the feature
- Hooks related to the feature (in `hooks/` subdirectory)
- Queries related to the feature (in `queries/` subdirectory)
- Types for the feature

Example: The posts feature is organized as:
```
/apps/app/src/features/posts/
├── columns.tsx
├── create-post-modal.tsx
├── post-editor.tsx
├── posts-table.tsx
├── recent-posts.tsx
├── recent-posts-client.tsx
├── hooks/
│   └── use-posts.ts
└── queries/
    └── posts.ts
```

### Multi-Tenant Data Model
- **Organizations**: Top-level tenant container
- **Teams**: Workspace within an organization
- **Members**: M2M relationship between users and teams
- **Dynamic RBAC**: Flexible role-based permissions stored in database

### Key Patterns
1. **Server Components First**: Use React Server Components by default, client components only when needed
2. **Data Fetching**: Use Tanstack Query with server-side prefetching in RSCs and client-side hooks
3. **Loading States**: Use skeleton components instead of spinners for better UX
4. **Type Safety**: Database types are auto-generated in `apps/app/src/lib/database.types.ts`
5. **RLS Enforcement**: All database access goes through Supabase RLS policies
6. **Form Handling**: Use react-hook-form with zod validation
7. **Error Handling**: Server actions return `{ error: string }` on failure
8. **Cache Management**: Use query keys for proper cache invalidation after mutations

## Development Workflow

1. **Always use pnpm** for package management
2. Run both `pnpm dev` and `supabase start` for local development
3. **Database Schema Changes** (Declarative approach):
   - Update schema files in `/supabase/schemas/`
   - Stop Supabase: `supabase stop`
   - Generate migration: `supabase db diff --use-migra -f [migration_name]`
   - Start Supabase: `supabase start`
   - Apply migration: `supabase migration up`
4. After schema changes, run `pnpm db:gen:types` to update TypeScript types
5. Use the existing UI components in `/apps/app/src/components/ui/` (Radix UI + Tailwind)

## Important Conventions

- **No semicolons** in TypeScript/JavaScript files
- **Double quotes** for strings
- Import order: external → internal → relative (enforced by Prettier)
- Path aliases: `@/*` for src, `@features/*` for features directory
- Environment variables are validated in `env.mjs` - add new ones there

## Authentication & Authorization

### Authentication
- Supabase Auth handles authentication
- Auth state is available via `@/lib/supabase/client` hooks

### Authorization (Dynamic RBAC)
- **Flexible permission system**: Roles and permissions are stored in database tables
- **Permission structure**: `resource` + `action` + `scope` (all/own)
- **Permission inheritance**: Org-level permissions can cascade to teams
- **RLS integration**: Tables use `user_permissions_view` for permission checks
- **UI permission checks**: Use RPC functions to show/hide UI elements:
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

### RLS Policy Template
For new tables following the multi-tenant pattern (with org_id, team_id, owner_id), use the simplified RLS template pattern with the `has_permission` helper function:

```sql
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

The `has_permission` function handles:
- Organization/team owner bypass checks
- Direct ownership checks (owner_id)
- Permission-based access via roles
- Proper scope handling (all/own)

## Database Schema

The database uses these main schemas:
- `public`: Core tables (organizations, teams, users, posts, etc.)
- `supajump`: Internal functions and views (including `user_permissions_view`)

### Key Tables
- `organizations`: Top-level tenants
- `teams`: Workspaces within organizations
- `org_memberships` / `team_memberships`: User associations
- `roles`: Named permission sets (org or team scoped)
- `role_permissions`: Specific permissions for each role
- `org_member_roles` / `team_member_roles`: Role assignments

Row Level Security is enforced on all tables - new tables must have appropriate RLS policies.

## CLI Tool

The `create-supajump-app` CLI provides a quick way to scaffold new Supajump projects:

```bash
# Development (from packages/create-supajump-app)
pnpm dev     # Watch mode for CLI development
pnpm build   # Build the CLI
npm link     # Link CLI globally for testing

# Usage
npx create-supajump-app my-app
# or
pnpm create supajump-app my-app
```

The CLI:
- Prompts for project configuration (package manager, git init, etc.)
- Copies the template with proper filtering (excludes node_modules, .next, etc.)
- Creates `.env.local` with placeholder values
- Optionally initializes git and installs dependencies
- Provides clear next steps for getting started
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supajump is a multi-tenant SaaS starter kit built with Next.js 15 and Supabase. It implements a hierarchical structure: Organizations → Teams → Users, with role-based access control and Row Level Security.

## Essential Commands

```bash
# Development
pnpm dev           # Start Next.js dev server with Turbopack
supabase start     # Start local Supabase instance (required for development)

# Building and Testing
pnpm build         # Build for production
pnpm lint          # Run ESLint (ALWAYS run before committing)

# Database Management
pnpm db:gen:types  # Generate TypeScript types from Supabase schema
supabase db push   # Push migrations to local database
supabase db reset  # Reset and reseed local database
```

## Architecture & Code Organization

### Data Access Pattern
All database queries are centralized in `/src/queries/index.ts` and exposed via the `api` object:

```typescript
import { api } from "@/queries"

// Use for server components/actions
const posts = await api.posts.findMany({ teamId })

// Use for client components
import { useQuery } from "@tanstack/react-query"
const { data } = useQuery(api.posts.findMany({ teamId }))
```

### Feature-Based Organization
New features should be added to `/src/features/[feature-name]/`:
- Components specific to the feature
- Hooks related to the feature
- Types for the feature

### Multi-Tenant Data Model
- **Organizations**: Top-level tenant container
- **Teams**: Workspace within an organization
- **Members**: M2M relationship between users and teams
- **Dynamic RBAC**: Flexible role-based permissions stored in database

### Key Patterns
1. **Server Components First**: Use React Server Components by default, client components only when needed
2. **Type Safety**: Database types are auto-generated in `src/lib/database.types.ts`
3. **RLS Enforcement**: All database access goes through Supabase RLS policies
4. **Form Handling**: Use react-hook-form with zod validation
5. **Error Handling**: Server actions return `{ error: string }` on failure

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
5. Use the existing UI components in `/src/components/ui/` (Radix UI + Tailwind)

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
For new tables following the multi-tenant pattern (with org_id, team_id, owner_id), use the standard RLS template from `/supabase/schemas/multi_tenant_rbac.sql` (sections 1416-1517)

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
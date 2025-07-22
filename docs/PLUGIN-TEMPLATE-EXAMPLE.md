# Example Generated Plugin: User Comments

This is an example of what the CLI generates when creating a new plugin with the "Basic CRUD" template.

## Generated Structure

```
user-comments/
├── plugin.json
├── README.md
├── components/
│   ├── comments-list.tsx
│   ├── comment-form.tsx
│   └── comment-item.tsx
├── hooks/
│   ├── use-comments.ts
│   └── use-create-comment.ts
├── queries/
│   ├── comments.ts
│   └── keys.ts
├── types/
│   └── index.ts
├── migrations/
│   └── 001_create_comments_table.sql
└── examples/
    ├── basic-usage.tsx
    └── with-permissions.tsx
```

## Generated Files

### plugin.json
```json
{
  "name": "user-comments",
  "version": "1.0.0",
  "description": "Add commenting functionality to any resource",
  "author": "John Doe",
  "license": "MIT",
  "type": "full-stack",
  "template": "basic-crud",
  "files": {
    "components/comments-list.tsx": "src/features/comments/components/comments-list.tsx",
    "components/comment-form.tsx": "src/features/comments/components/comment-form.tsx",
    "components/comment-item.tsx": "src/features/comments/components/comment-item.tsx",
    "hooks/use-comments.ts": "src/features/comments/hooks/use-comments.ts",
    "hooks/use-create-comment.ts": "src/features/comments/hooks/use-create-comment.ts",
    "queries/comments.ts": "src/queries/plugins/comments.ts",
    "queries/keys.ts": "src/queries/plugins/comments-keys.ts",
    "types/index.ts": "src/features/comments/types/index.ts"
  },
  "dependencies": {
    "npm": {},
    "shadcn": ["button", "form", "textarea", "avatar", "skeleton"]
  },
  "migrations": [
    {
      "version": "001",
      "file": "migrations/001_create_comments_table.sql",
      "description": "Create comments table with RLS policies"
    }
  ],
  "config": {
    "permissions": ["comments.view", "comments.create", "comments.edit", "comments.delete"],
    "settings": {
      "enableMarkdown": {
        "type": "boolean",
        "default": true,
        "description": "Enable markdown formatting in comments"
      },
      "maxLength": {
        "type": "number",
        "default": 5000,
        "description": "Maximum comment length"
      }
    }
  }
}
```

### components/comments-list.tsx
```tsx
"use client"

import { useComments } from "../hooks/use-comments"
import { CommentForm } from "./comment-form"
import { CommentItem } from "./comment-item"
import { Skeleton } from "@/components/ui/skeleton"

interface CommentsListProps {
  resourceType: string
  resourceId: string
  orgId: string
  teamId: string
}

export function CommentsList({ resourceType, resourceId, orgId, teamId }: CommentsListProps) {
  const { data: comments, isLoading } = useComments({
    resourceType,
    resourceId,
    orgId,
    teamId,
  })

  if (isLoading) {
    return <CommentsListSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Comments</h3>
        <CommentForm
          resourceType={resourceType}
          resourceId={resourceId}
          orgId={orgId}
          teamId={teamId}
        />
      </div>

      <div className="space-y-4">
        {comments?.length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
        ) : (
          comments?.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  )
}

function CommentsListSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### components/comment-form.tsx
```tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useCreateComment } from "../hooks/use-create-comment"
import { toast } from "sonner"

const formSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000, "Comment is too long"),
})

interface CommentFormProps {
  resourceType: string
  resourceId: string
  orgId: string
  teamId: string
}

export function CommentForm({ resourceType, resourceId, orgId, teamId }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createComment = useCreateComment()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await createComment.mutateAsync({
        content: values.content,
        resource_type: resourceType,
        resource_id: resourceId,
        org_id: orgId,
        team_id: teamId,
      })
      form.reset()
      toast.success("Comment added")
    } catch (error) {
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Write a comment..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </form>
    </Form>
  )
}
```

### hooks/use-comments.ts
```tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { commentsKeys } from "../queries/keys"
import { api } from "@/queries"

interface UseCommentsOptions {
  resourceType: string
  resourceId: string
  orgId: string
  teamId: string
}

export function useComments({ resourceType, resourceId, orgId, teamId }: UseCommentsOptions) {
  const supabase = createClient()

  return useQuery({
    queryKey: commentsKeys.list(resourceType, resourceId),
    queryFn: () => api.comments.getByResource(supabase, {
      resource_type: resourceType,
      resource_id: resourceId,
      org_id: orgId,
      team_id: teamId,
    }),
  })
}
```

### queries/comments.ts
```typescript
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types"
import { Comment, CreateCommentInput } from "../types"

export const commentsQueries = {
  async getByResource(
    supabase: SupabaseClient<Database>,
    params: {
      resource_type: string
      resource_id: string
      org_id: string
      team_id: string
    }
  ): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        author:author_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq("resource_type", params.resource_type)
      .eq("resource_id", params.resource_id)
      .eq("org_id", params.org_id)
      .eq("team_id", params.team_id)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  },

  async create(
    supabase: SupabaseClient<Database>,
    input: CreateCommentInput
  ): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data, error } = await supabase
      .from("comments")
      .insert({
        ...input,
        author_id: user.id,
      })
      .select(`
        *,
        author:author_id (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  async update(
    supabase: SupabaseClient<Database>,
    id: string,
    content: string
  ): Promise<Comment> {
    const { data, error } = await supabase
      .from("comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        author:author_id (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  async delete(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)

    if (error) throw error
  },
}
```

### types/index.ts
```typescript
export interface Comment {
  id: string
  content: string
  author_id: string
  resource_type: string
  resource_id: string
  org_id: string
  team_id: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface CreateCommentInput {
  content: string
  resource_type: string
  resource_id: string
  org_id: string
  team_id: string
}

export interface UpdateCommentInput {
  content: string
}
```

### migrations/001_create_comments_table.sql
```sql
-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_org_team ON comments(org_id, team_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies using Supajump's permission system
CREATE POLICY "rls_comments_select" ON comments 
FOR SELECT TO authenticated USING (
  supajump.has_permission('comments', 'view', org_id, team_id, author_id)
);

CREATE POLICY "rls_comments_insert" ON comments 
FOR INSERT TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'create', org_id, team_id, NULL::uuid)
  AND auth.uid() = author_id
);

CREATE POLICY "rls_comments_update" ON comments 
FOR UPDATE TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'edit', org_id, team_id, author_id)
);

CREATE POLICY "rls_comments_delete" ON comments 
FOR DELETE TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'delete', org_id, team_id, author_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### examples/basic-usage.tsx
```tsx
import { CommentsList } from "@/features/comments/components/comments-list"

export default function PostPage({ 
  params 
}: { 
  params: { orgId: string; teamId: string; postId: string } 
}) {
  return (
    <div className="container mx-auto py-8">
      <article>
        {/* Your post content */}
      </article>
      
      <div className="mt-12 border-t pt-8">
        <CommentsList
          resourceType="post"
          resourceId={params.postId}
          orgId={params.orgId}
          teamId={params.teamId}
        />
      </div>
    </div>
  )
}
```

### README.md (generated)
```markdown
# User Comments Plugin

Add commenting functionality to any resource in your Supajump application.

## Installation

```bash
supajump plugins add user-comments
```

## Features

- 💬 Add comments to any resource (posts, tasks, documents, etc.)
- 👤 User avatars and names
- ✏️ Edit and delete own comments
- 🔒 Full RLS protection with Supajump's permission system
- ⚡ Real-time updates (optional)
- 📝 Markdown support (configurable)

## Usage

### Basic Usage

Add comments to any page by importing the `CommentsList` component:

```tsx
import { CommentsList } from "@/features/comments/components/comments-list"

export function PostPage({ post, orgId, teamId }) {
  return (
    <div>
      {/* Your content */}
      
      <CommentsList
        resourceType="post"
        resourceId={post.id}
        orgId={orgId}
        teamId={teamId}
      />
    </div>
  )
}
```

### With Custom Permissions

Check permissions before showing the comments section:

```tsx
const canViewComments = await supabase.rpc('has_team_permission', {
  _team_id: teamId,
  _resource: 'comments',
  _action: 'view'
})

if (canViewComments) {
  return <CommentsList {...props} />
}
```

## Configuration

### Plugin Settings

Configure in your environment or plugin settings:

- `enableMarkdown` (boolean, default: true) - Enable markdown formatting
- `maxLength` (number, default: 5000) - Maximum comment length

### Required Permissions

This plugin uses these permission keys:
- `comments.view` - View comments
- `comments.create` - Create new comments
- `comments.edit` - Edit own comments (or all with scope)
- `comments.delete` - Delete own comments (or all with scope)

## Database Schema

The plugin creates a `comments` table with:
- Multi-resource support (resource_type + resource_id)
- Full audit trail (created_at, updated_at)
- Author relationship
- Organization and team scoping

## Customization

### Styling

The components use Tailwind classes and can be customized via:
- Custom CSS classes passed as props
- Tailwind configuration
- shadcn/ui theme variables

### Extending

Create custom comment components by importing the hooks:

```tsx
import { useComments, useCreateComment } from "@/features/comments/hooks"

export function CustomComments() {
  const { data: comments } = useComments({...})
  const createComment = useCreateComment()
  
  // Your custom implementation
}
```

## API Reference

### Components

- `CommentsList` - Main component that displays comments
- `CommentForm` - Form for adding new comments  
- `CommentItem` - Individual comment display

### Hooks

- `useComments` - Fetch comments for a resource
- `useCreateComment` - Create a new comment
- `useUpdateComment` - Update an existing comment
- `useDeleteComment` - Delete a comment

### Types

```typescript
interface Comment {
  id: string
  content: string
  author_id: string
  resource_type: string
  resource_id: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    name: string
    avatar_url?: string
  }
}
```

## License

MIT
```

This example shows a complete, production-ready plugin that developers would get when running `supajump plugins create` with the Basic CRUD template.
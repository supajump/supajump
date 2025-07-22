# Supajump Registry - Technical Implementation

## Terminology

**Plugins**: Self-contained full-stack features that can be added to a Supajump project. Each plugin includes:
- React components
- Database migrations (optional)
- API endpoints/queries (optional)
- Styles and assets
- Configuration
- shadcn/ui component dependencies

## Core Concepts

### 1. Plugin Structure

A plugin is a directory containing all necessary files:

```
plugins/
├── rich-editor/
│   ├── plugin.json          # Metadata and configuration
│   ├── components/          # React components
│   │   ├── editor.tsx
│   │   └── toolbar.tsx
│   ├── hooks/              # Custom hooks
│   │   └── use-editor.ts
│   ├── queries/            # API queries/mutations
│   │   └── editor.ts
│   ├── migrations/         # SQL migrations
│   │   └── 001_editor_tables.sql
│   └── README.md           # Documentation
```

### 2. Plugin Metadata (plugin.json)

```json
{
  "name": "rich-editor",
  "version": "1.0.0",
  "description": "TipTap-based rich text editor",
  "files": {
    "components/editor.tsx": "src/features/editor/components/editor.tsx",
    "components/toolbar.tsx": "src/features/editor/components/toolbar.tsx",
    "hooks/use-editor.ts": "src/features/editor/hooks/use-editor.ts",
    "queries/editor.ts": "src/queries/plugins/editor.ts"
  },
  "dependencies": {
    "npm": {
      "@tiptap/react": "^2.1.0",
      "@tiptap/starter-kit": "^2.1.0"
    },
    "shadcn": ["button", "dropdown-menu", "separator", "tooltip"]
  },
  "migrations": ["migrations/001_editor_tables.sql"],
  "config": {
    "envVars": ["OPENAI_API_KEY"],
    "permissions": ["posts.edit"]
  }
}
```

## CLI Implementation

### Commands

```bash
# List available plugins
supajump plugins list
supajump plugins list --installed  # Show only installed plugins

# Search plugins
supajump plugins search "editor"

# Add a plugin
supajump plugins add rich-editor
supajump plugins add rich-editor@1.0.0  # Specific version

# Update a plugin
supajump plugins update rich-editor
supajump plugins update --all  # Update all plugins

# Remove a plugin
supajump plugins remove rich-editor

# Info about a plugin
supajump plugins info rich-editor
```

### CLI Workflows

#### Adding a Plugin

```bash
$ supajump plugins add rich-editor

Analyzing plugin requirements...
✓ NPM dependencies: @tiptap/react, @tiptap/starter-kit
✓ shadcn components needed: button, dropdown-menu, separator, tooltip
✓ Database migrations: 1 migration found
✓ Environment variables: OPENAI_API_KEY (optional)

The following will be installed:

shadcn components:
  - button
  - dropdown-menu  
  - separator
  - tooltip

Plugin files:
  src/features/editor/components/editor.tsx
  src/features/editor/components/toolbar.tsx
  src/features/editor/hooks/use-editor.ts
  src/queries/plugins/editor.ts

Continue? [Y/n] Y

Installing shadcn components...
✓ npx shadcn-ui@latest add button dropdown-menu separator tooltip

Installing NPM dependencies...
✓ Dependencies installed

Copying plugin files...
✓ Files copied

Running migrations...
✓ Migration 001_editor_tables.sql applied

Generating TypeScript types...
✓ Types generated

Plugin "rich-editor" successfully installed!

Next steps:
1. Set OPENAI_API_KEY in your .env.local file (optional)
2. Import and use the editor: import { RichEditor } from '@/features/editor'
```

#### Updating a Plugin

```bash
$ supajump plugins update rich-editor

Checking for updates...
✓ Update available: 1.0.0 → 1.1.0

Changes in this update:
  Modified: src/features/editor/components/editor.tsx
  Added: src/features/editor/components/ai-toolbar.tsx
  Modified: src/queries/plugins/editor.ts
  New shadcn dependencies: badge, popover

View detailed diff? [y/N] y

[Shows diff for each file]

How would you like to proceed?
  [A]ccept all changes
  [I]nteractive (review each file)
  [S]kip this update
  
Choice: I

Installing new shadcn components...
✓ npx shadcn-ui@latest add badge popover

File: src/features/editor/components/editor.tsx
This file has local modifications.
  [M]erge changes
  [K]eep local version
  [O]verwrite with update
  [V]iew side-by-side diff

Choice: M

✓ Changes merged successfully
✓ Plugin updated to version 1.1.0
```

## Implementation Details

### 1. Registry Storage

Local registry for development:
```
.supajump/
├── registry/
│   ├── index.json       # List of all plugins
│   └── plugins/         # Plugin files
└── installed.json       # Track installed plugins and versions
```

Remote registry structure:
```
https://registry.supajump.com/
├── index.json           # Master index
├── plugins/
│   └── [plugin-name]/
│       └── [version]/
│           └── plugin.tar.gz
```

### 2. File Management

```typescript
// Track installed plugins
interface InstalledPlugin {
  name: string
  version: string
  installedAt: string
  files: string[]  // Track all files for clean removal
  modified: string[] // Track user-modified files
  shadcnComponents: string[] // Track installed shadcn components
}

// Registry index
interface RegistryIndex {
  plugins: {
    name: string
    latest: string
    versions: string[]
    description: string
    tags: string[]
  }[]
}
```

### 3. Diff and Merge Strategy

```typescript
// Detect file modifications
async function isFileModified(filePath: string, originalHash: string): boolean {
  const currentHash = await hashFile(filePath)
  return currentHash !== originalHash
}

// Smart merge
async function mergeFile(
  originalContent: string,
  currentContent: string,
  newContent: string
): string {
  // Use git-like 3-way merge
  // If automatic merge fails, prompt user
}
```

### 4. Migration Handling

```typescript
interface PluginMigration {
  version: string
  up: string  // SQL to apply
  down: string  // SQL to rollback
}

// Track applied migrations
interface AppliedMigration {
  plugin: string
  version: string
  appliedAt: string
}
```

### 5. shadcn Integration

```typescript
interface ShadcnInstaller {
  // Check if shadcn components are already installed
  async checkInstalled(components: string[]): Promise<{
    installed: string[]
    missing: string[]
  }>

  // Install missing shadcn components
  async installComponents(components: string[]): Promise<void> {
    const missing = await this.checkMissing(components)
    if (missing.length > 0) {
      await exec(`npx shadcn-ui@latest add ${missing.join(' ')}`)
    }
  }
}
```

## Directory Structure in Project

After installing plugins, the project structure becomes:

```
src/
├── components/
│   └── ui/              # shadcn components
│       ├── button.tsx
│       ├── dropdown-menu.tsx
│       └── ...
├── features/
│   ├── editor/          # From rich-editor plugin
│   ├── analytics/       # From analytics plugin
│   └── calendar/        # From calendar plugin
├── queries/
│   ├── plugins/         # Plugin-specific queries
│   │   ├── editor.ts
│   │   └── analytics.ts
│   └── index.ts         # Main queries file
└── .supajump/
    └── installed.json   # Track installed plugins
```

## Development Workflow

### Creating a Plugin

The CLI provides an interactive plugin creation wizard to bootstrap new plugins with best practices:

```bash
$ supajump plugins create

? Plugin name: user-comments
? Description: Add commenting functionality to any resource
? Author: John Doe
? Select plugin type: 
  ❯ Full-stack (UI + Database)
    UI only
    Database only
    
? Select a template:
  ❯ Basic CRUD - Simple create, read, update, delete operations
    Data Table - Advanced table with filtering, sorting, pagination  
    Form Builder - Complex forms with validation
    Dashboard Widget - Analytics or status display
    Custom (blank) - Start from scratch

? Will this plugin need database migrations? Yes
? Select shadcn components to include:
  ◉ button
  ◉ form
  ◯ dialog
  ◉ textarea
  ◯ dropdown-menu
  ◉ avatar
  
? Select features to include:
  ◉ TypeScript types
  ◉ API queries (Tanstack Query)
  ◉ RLS policies template
  ◯ Real-time subscriptions
  ◉ Permission checks
  
Creating plugin template...
✓ Created plugin structure at ./user-comments
✓ Generated TypeScript types
✓ Created example components
✓ Added query templates
✓ Created migration template
✓ Generated README.md

Plugin structure:
  user-comments/
  ├── plugin.json          # Plugin metadata
  ├── README.md           # Documentation  
  ├── components/         
  │   ├── comments-list.tsx
  │   ├── comment-form.tsx
  │   └── comment-item.tsx
  ├── hooks/
  │   └── use-comments.ts
  ├── queries/
  │   └── comments.ts
  ├── migrations/
  │   └── 001_create_comments_table.sql
  ├── types/
  │   └── index.ts
  └── examples/
      └── basic-usage.tsx

Next steps:
1. cd user-comments
2. Review and customize the generated code
3. Test locally: supajump plugins add ../user-comments
4. Update README.md with your documentation
```

### Plugin Templates

#### Basic CRUD Template
Generates a simple CRUD interface with:
- List view with data table
- Create/Edit forms
- Delete functionality
- Basic RLS policies

#### Data Table Template
Advanced data table with:
- Server-side pagination
- Column sorting
- Filtering
- Export functionality
- Bulk actions

#### Form Builder Template
Complex form handling with:
- Multi-step forms
- Field validation (Zod)
- File uploads
- Conditional fields
- Form state management

#### Dashboard Widget Template
For analytics and monitoring:
- Chart components
- Stats cards
- Real-time updates
- Date range filtering

### Generated Plugin Structure

```typescript
// plugin.json (generated)
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
    "queries/comments.ts": "src/queries/plugins/comments.ts",
    "types/index.ts": "src/features/comments/types/index.ts"
  },
  "dependencies": {
    "npm": {},
    "shadcn": ["button", "form", "textarea", "avatar"]
  },
  "migrations": [
    {
      "version": "001",
      "file": "migrations/001_create_comments_table.sql"
    }
  ],
  "config": {
    "permissions": ["comments.view", "comments.create", "comments.edit", "comments.delete"],
    "settings": {
      "enableMarkdown": {
        "type": "boolean",
        "default": true,
        "description": "Enable markdown formatting in comments"
      }
    }
  }
}
```

```typescript
// types/index.ts (generated)
export interface Comment {
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

export interface CreateCommentInput {
  content: string
  resource_type: string
  resource_id: string
}
```

```sql
-- migrations/001_create_comments_table.sql (generated)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_comments_resource (resource_type, resource_id),
  INDEX idx_comments_author (author_id),
  INDEX idx_comments_org_team (org_id, team_id)
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using Supajump's permission system)
CREATE POLICY "rls_comments_select" ON comments 
FOR SELECT TO authenticated USING (
  supajump.has_permission('comments', 'view', org_id, team_id, author_id)
);

CREATE POLICY "rls_comments_insert" ON comments 
FOR INSERT TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'create', org_id, team_id, author_id)
);

CREATE POLICY "rls_comments_update" ON comments 
FOR UPDATE TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'edit', org_id, team_id, author_id)
);

CREATE POLICY "rls_comments_delete" ON comments 
FOR DELETE TO authenticated WITH CHECK (
  supajump.has_permission('comments', 'delete', org_id, team_id, author_id)
);
```

### Testing a Local Plugin

```bash
# Install from local directory
$ supajump plugins add ./my-plugin

# Install from GitHub
$ supajump plugins add github:username/repo/plugins/my-plugin

# Install with hot reload for development
$ supajump plugins add ./my-plugin --dev
```

### Plugin Development Mode

When developing a plugin locally, use the `--dev` flag to enable hot reload:

```bash
$ supajump plugins add ./user-comments --dev

✓ Plugin linked in development mode
✓ Watching for changes...

Changes detected in comment-form.tsx
✓ Reloaded plugin files

[Press Ctrl+C to stop watching]
```

## Technical Considerations

### 1. Version Compatibility

- Plugins specify compatible Supajump versions
- CLI checks compatibility before installing
- Warn about potential breaking changes

### 2. Dependency Management

- NPM dependencies merged into project's package.json
- shadcn components installed via their CLI
- Check for version conflicts
- Track which shadcn components belong to which plugin

### 3. File Tracking

- Store checksums of original files
- Track which files belong to which plugin
- Track shadcn components per plugin
- Clean removal without affecting other code

### 4. Update Safety

- Never overwrite user modifications without consent
- Backup files before updates
- Rollback capability for failed updates
- Check for new shadcn dependencies before updating

## Next Steps

1. Implement core CLI commands
2. Create 2-3 example plugins
3. Set up local registry structure
4. Build diff/merge functionality
5. Add migration runner
6. Integrate shadcn component installer
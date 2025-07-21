# Supajump Registry System Plan

> **Note**: This is a future feature plan. Do not reference this document for typical Supajump development unless specifically working on the registry system implementation.

## Overview

Supajump will implement a plugin-style registry system that allows users to add pre-built features to their projects while maintaining full code ownership. Similar to shadcn/ui's approach, code will be copied into projects rather than installed as dependencies, allowing for complete customization while still enabling updates.

## Goals

- **Code Ownership**: Users own all code in their project
- **Extensibility**: Easy to modify and extend features
- **Updates**: Opt-in updates with clear diffs
- **Community**: Enable community-contributed features
- **Type Safety**: Full TypeScript support
- **Database Integration**: Features can include migrations and RLS policies

## Registry Architecture

### 1. Registry Structure

```
supajump-registry/
├── registry.json          # Master index of all features
├── features/
│   ├── editor-tiptap/
│   │   ├── meta.json     # Feature metadata
│   │   ├── files.json    # File mapping
│   │   ├── schema.sql    # Database migrations
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities
│   │   └── styles/       # CSS/Tailwind
│   ├── editor-canvas/
│   ├── admin-posts/
│   └── ...
```

### 2. Feature Metadata Schema

```json
{
  "name": "editor-tiptap",
  "version": "1.0.0",
  "description": "Rich text editor with AI tools, mentions, and media",
  "dependencies": {
    "npm": ["@tiptap/react", "@tiptap/starter-kit"],
    "features": ["auth", "storage"], // Required Supajump features
    "database": ["posts", "media"]   // Required tables
  },
  "files": {
    "components/editor/tiptap-editor.tsx": "src/features/editor/tiptap-editor.tsx",
    "hooks/use-editor.ts": "src/features/editor/hooks/use-editor.ts",
    "lib/tiptap-extensions.ts": "src/lib/tiptap-extensions.ts"
  },
  "migrations": ["001_add_editor_fields.sql"],
  "config": {
    "variables": ["OPENAI_API_KEY"], // Required env vars
    "permissions": ["posts.edit", "media.upload"]
  }
}
```

### 3. CLI Commands

```bash
# List available features
npx supajump list

# Add a feature
npx supajump add editor-tiptap
# - Checks dependencies
# - Copies files to correct locations
# - Runs migrations
# - Updates package.json
# - Shows post-install instructions

# Update a feature (with diff preview)
npx supajump update editor-tiptap
# - Fetches latest version
# - Shows diff for each file
# - Prompts: [A]ccept, [S]kip, [M]erge, [V]iew
# - Preserves local modifications

# Remove a feature
npx supajump remove editor-tiptap
# - Lists files to be removed
# - Warns about database changes
# - Confirms before deletion
```

### 4. Smart Conflict Resolution

```typescript
// When updating, detect modification patterns
const updateStrategies = {
  // User added custom code blocks
  customBlocks: 'merge',
  
  // User modified existing functions
  modifiedFunctions: 'prompt',
  
  // Only imports changed
  imports: 'auto-merge',
  
  // New feature code
  newFeatures: 'accept'
}
```

### 5. Feature Examples

#### TipTap Editor Feature
- Rich text with markdown shortcuts
- AI writing assistant integration
- @mentions with user search
- Image upload with Supabase storage
- Collaborative editing ready

#### Canvas Design Editor Feature
- Fabric.js or Konva.js based
- Template system
- Asset library integration
- Export to various formats
- Undo/redo with shortcuts

#### Admin Posts Feature
- CRUD pages with data tables
- Filtering and search
- Bulk actions
- Export functionality
- Permission-aware UI

### 6. Registry Hosting Options

1. **GitHub Registry**: Features in a public repo, CLI fetches from GitHub API
2. **NPM Registry**: Each feature as a scoped package that gets "ejected"
3. **Self-hosted**: JSON API for private/custom features
4. **Hybrid**: Core features on GitHub, custom features self-hosted

### 7. Developer Experience

```typescript
// Feature development kit
npx create-supajump-feature my-feature

// Generates:
// - Proper file structure
// - Meta.json template
// - Test harness
// - Documentation template
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Basic CLI with add/remove commands
- Simple file copying mechanism
- Manual registry.json

### Phase 2: Smart Updates
- Diff viewing and merging
- Dependency resolution
- Migration handling

### Phase 3: Community Features
- GitHub-based registry
- Feature submission process
- Automated testing

### Phase 4: Advanced Features
- Feature composition
- Custom registries
- IDE integration

## Technical Considerations

### File Organization
- Features should be self-contained
- Clear separation between feature code and project code
- Consistent naming conventions

### Version Management
- Semantic versioning for features
- Compatibility matrix with Supajump versions
- Breaking change notifications

### Testing Strategy
- Each feature includes example tests
- Integration test templates
- Automated compatibility testing

### Documentation Requirements
- Each feature must include README
- API documentation
- Example usage
- Migration guides

## Benefits

1. **For Users**
   - No vendor lock-in
   - Full customization ability
   - Easy to understand codebase
   - Gradual adoption path

2. **For Contributors**
   - Clear contribution guidelines
   - Reusable components
   - Community recognition
   - Potential monetization

3. **For Supajump**
   - Faster feature delivery
   - Community-driven growth
   - Reduced core maintenance
   - Ecosystem development

## Next Steps

1. Prototype the CLI tool
2. Create 2-3 example features
3. Test with beta users
4. Refine based on feedback
5. Launch with documentation

## Composability and Extension Patterns

> **Note**: These patterns are exploratory and will likely evolve during implementation.

To ensure user customizations aren't lost during feature updates, we're exploring several composability patterns:

### 1. **Extension Points Pattern** (WordPress-style)
```typescript
// In registry feature code
export const EditorExtensions = {
  toolbar: [],
  menuItems: [],
  keybindings: [],
  beforeSave: [],
  afterSave: []
}

// User's extension file (never overwritten)
// src/features/editor/extensions.ts
EditorExtensions.toolbar.push({
  name: 'custom-tool',
  icon: CustomIcon,
  action: (editor) => { /* ... */ }
})
```

### 2. **Component Slots Pattern**
```tsx
// Registry feature provides slots
export function TipTapEditor({ 
  slots = {
    beforeToolbar: null,
    afterToolbar: null,
    customTools: [],
  }
}) {
  return (
    <>
      {slots.beforeToolbar}
      <Toolbar>
        <DefaultTools />
        {slots.customTools.map(Tool => <Tool key={Tool.name} />)}
      </Toolbar>
      {slots.afterToolbar}
    </>
  )
}
```

### 3. **Config-First Approach**
```typescript
// Feature looks for user config file
// src/config/editor.config.ts (gitignored from updates)
export const editorConfig = {
  extensions: [...customExtensions],
  theme: { toolbar: 'minimal' },
  hooks: {
    onInit: (editor) => trackEvent('editor_opened'),
    onChange: debounce(autoSave, 1000)
  }
}
```

### 4. **Event-Driven Architecture**
```typescript
// Registry feature emits events
import { editorEvents } from './tiptap-editor'

// User's event handlers (separate file)
editorEvents.on('toolbar:init', (toolbar) => {
  toolbar.addButton({ /* custom button */ })
})

editorEvents.on('save', async (content) => {
  await syncToExternalService(content)
})
```

### 5. **Hybrid Approach** (Recommended for exploration)
```typescript
// 1. Each feature exports extension points
export const editorHooks = createHooks([
  'beforeInit',
  'afterInit', 
  'beforeSave',
  'transformContent'
])

// 2. User config file (never overwritten)
// src/supajump/features/editor.ts
editorHooks.beforeSave.use(async (content) => {
  // Custom processing
  return content
})

// 3. Component composition
export function MyTipTapEditor(props) {
  return (
    <TipTapEditor
      {...props}
      extensions={[...defaultExtensions, ...myExtensions]}
      components={{
        Toolbar: MyCustomToolbar,
        MenuBar: MyMenuBar
      }}
    />
  )
}
```

### Key Principles
- Core functionality stays updatable
- User extensions are preserved in separate files
- Clear separation between registry code and user code
- Type-safe integration points
- Multiple extension methods for different use cases

### Implementation Considerations
- Extension files should be clearly marked and documented
- CLI should detect and preserve user extension files during updates
- Registry features should provide TypeScript interfaces for all extension points
- Consider a `.supajumpignore` file for marking user customizations

## Open Questions

- How to handle breaking changes in features?
- Should features be able to modify core files?
- How to handle feature conflicts?
- Monetization model for premium features?
- How to ensure quality standards?
- Which composability pattern(s) work best for different feature types?
- How to handle dependencies between user extensions and feature updates?

---

*This document will be updated as the registry system design evolves.*
# Plugin Build-Time Integration Approach

## Overview

This document describes a potential build-time integration approach for enabling/disabling plugins through configuration. This is a simpler alternative to runtime lifecycle hooks.

## How It Works

### 1. Plugin Configuration

```typescript
// src/plugins.config.ts
export default {
  plugins: {
    comments: { 
      enabled: true,
      config: {
        maxLength: 5000,
        enableMarkdown: true
      }
    },
    admin: { 
      enabled: true 
    },
    analytics: { 
      enabled: false  // Installed but not active
    }
  }
}
```

### 2. Build Process

When the config changes:
- **Development**: HMR detects changes and rebuilds
- **Production**: Requires new build

The build process:
1. Reads `plugins.config.ts`
2. Generates integration files based on enabled plugins
3. Only includes enabled plugin code in bundles

### 3. Route Integration

Plugins can define routes in their metadata:

```json
// plugins/admin/plugin.json
{
  "name": "admin",
  "routes": [
    {
      "path": "(admin)",
      "files": {
        "layout.tsx": "routes/layout.tsx",
        "page.tsx": "routes/page.tsx",
        "users/page.tsx": "routes/users/page.tsx"
      }
    }
  ]
}
```

Build process generates route files:

```typescript
// Auto-generated: src/app/(app)/[orgId]/[teamId]/(admin)/layout.tsx
export { default } from '@/plugins/admin/routes/layout'

// Only created if admin plugin is enabled
```

### 4. Navigation Integration

Auto-generated navigation based on enabled plugins:

```typescript
// Auto-generated: src/components/navigation/plugin-nav-items.tsx
import { Settings, BarChart, MessageSquare } from 'lucide-react'

export const pluginNavItems = [
  // Only includes items from enabled plugins
  {
    label: 'Admin',
    href: 'admin',
    icon: Settings,
    plugin: 'admin',
    permissions: ['admin.view']
  },
  {
    label: 'Comments',
    href: 'comments',
    icon: MessageSquare,
    plugin: 'comments',
    permissions: ['comments.view']
  }
  // Analytics excluded because enabled: false
]
```

### 5. Query Integration

API object only includes enabled plugins:

```typescript
// Auto-generated: src/queries/plugin-queries.ts
import { pluginsConfig } from '@/plugins.config'

// Conditional exports based on config
export const pluginQueries = {
  ...(pluginsConfig.plugins.comments?.enabled && {
    comments: () => import('@/plugins/comments/queries').then(m => m.commentsQueries)
  }),
  ...(pluginsConfig.plugins.admin?.enabled && {
    admin: () => import('@/plugins/admin/queries').then(m => m.adminQueries)
  })
}
```

### 6. Type Safety

TypeScript knows what's enabled:

```typescript
// Auto-generated: src/types/enabled-plugins.ts
export type EnabledPlugins = 'comments' | 'admin'

// Type-safe plugin access
import { api } from '@/queries'
api.comments.getAll() // ✓ TypeScript knows this exists
api.analytics.getData() // ✗ TypeScript error - plugin disabled
```

## Implementation Details

### File Watcher

During development, watch for config changes:

```typescript
// CLI watches plugins.config.ts
onConfigChange(() => {
  // Regenerate route files
  generatePluginRoutes()
  
  // Update navigation items
  generatePluginNav()
  
  // Update query exports
  generatePluginQueries()
  
  // Update TypeScript types
  generatePluginTypes()
})
```

### Build Step

Add to Next.js build process:

```typescript
// next.config.js
module.exports = {
  webpack: (config, options) => {
    if (!options.isServer) {
      // Run plugin integration before build
      require('./scripts/integrate-plugins')()
    }
    return config
  }
}
```

## Benefits

1. **Simple Mental Model**: Change config → restart/rebuild
2. **No Runtime Overhead**: No checking if plugins are enabled
3. **Type Safety**: TypeScript knows exactly what's available
4. **Tree Shaking**: Disabled plugins not included in bundle
5. **Next.js Native**: Works with Next.js patterns

## Limitations

1. **Requires Rebuild**: Can't toggle plugins at runtime
2. **Dev Server Restart**: Config changes need restart
3. **No Dynamic Routes**: Plugin routes must be known at build time

## Migration Path

Start simple:
1. Phase 1: Manual enable/disable (current approach)
2. Phase 2: Config file with manual integration
3. Phase 3: Auto-generation on config change
4. Phase 4: Full build-time integration

## Example Usage

```bash
# Install a plugin
$ supajump plugins add admin

✓ Plugin installed to /plugins/admin
✓ Added to plugins.config.ts (enabled: true)
✓ Routes generated
✓ Navigation updated

# Disable a plugin
$ supajump plugins disable admin

✓ Set enabled: false in plugins.config.ts
✓ Routes removed
✓ Navigation updated
ℹ Plugin files remain in /plugins/admin

# Re-enable
$ supajump plugins enable admin

✓ Set enabled: true in plugins.config.ts
✓ Routes generated
✓ Navigation updated

# Fully remove
$ supajump plugins remove admin

✓ Plugin files removed
✓ Removed from plugins.config.ts
✓ Routes cleaned up
```

## Future Considerations

This approach could evolve to support:
- Environment-specific configs
- Feature flags
- A/B testing different plugins
- Gradual rollouts

But starting with simple build-time integration keeps complexity low while providing the core functionality of enabling/disabling plugins.
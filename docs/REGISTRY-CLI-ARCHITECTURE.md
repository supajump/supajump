# Supajump CLI - Plugins Architecture

## CLI Structure

The plugins functionality will be integrated into the existing Supajump CLI as a new command group.

```
packages/create-supajump-app/
├── src/
│   ├── commands/
│   │   ├── plugins/
│   │   │   ├── add.ts
│   │   │   ├── remove.ts
│   │   │   ├── update.ts
│   │   │   ├── list.ts
│   │   │   ├── info.ts
│   │   │   └── create.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── plugins/
│   │   │   ├── registry.ts      # Registry client
│   │   │   ├── installer.ts     # Plugin installation logic
│   │   │   ├── updater.ts       # Update/diff logic
│   │   │   ├── tracker.ts       # Track installed plugins
│   │   │   ├── migrator.ts      # Run migrations
│   │   │   ├── differ.ts        # File diff utilities
│   │   │   └── shadcn.ts        # shadcn component installer
│   │   └── utils/
│   └── index.ts
```

## Core Components

### 1. Registry Client

```typescript
// src/lib/plugins/registry.ts
interface Registry {
  getIndex(): Promise<PluginIndex>
  getPlugin(name: string, version?: string): Promise<PluginMetadata>
  downloadPlugin(name: string, version: string): Promise<PluginBundle>
  search(query: string): Promise<PluginInfo[]>
}

class LocalRegistry implements Registry {
  constructor(private path: string) {}
  // Implementation for local development
}

class RemoteRegistry implements Registry {
  constructor(private baseUrl: string) {}
  // Implementation for remote registry
}
```

### 2. Plugin Installer

```typescript
// src/lib/plugins/installer.ts
export class PluginInstaller {
  constructor(
    private registry: Registry,
    private projectRoot: string,
    private tracker: PluginTracker,
    private shadcnInstaller: ShadcnInstaller
  ) {}

  async install(pluginName: string, version?: string): Promise<InstallResult> {
    // 1. Check if already installed
    // 2. Download plugin
    // 3. Validate dependencies
    // 4. Install shadcn components
    // 5. Copy files to project
    // 6. Install npm dependencies
    // 7. Run migrations
    // 8. Update tracking info
    // 9. Generate types
  }

  private async validateDependencies(plugin: PluginMetadata): Promise<ValidationResult> {
    // Check npm dependencies
    // Check required plugins
    // Check shadcn components
    // Check env vars
    // Check permissions
  }

  private async copyFiles(plugin: PluginBundle): Promise<FileCopyResult> {
    // Map plugin files to project structure
    // Create directories as needed
    // Copy with proper permissions
    // Track file hashes
  }
}
```

### 3. Plugin Tracker

```typescript
// src/lib/plugins/tracker.ts
interface TrackedPlugin {
  name: string
  version: string
  installedAt: string
  files: TrackedFile[]
  migrations: string[]
  npmDependencies: string[]
  shadcnComponents: string[]
}

interface TrackedFile {
  sourcePath: string    // Path in plugin
  targetPath: string    // Path in project
  hash: string         // Original file hash
  modified: boolean    // User modified?
}

export class PluginTracker {
  private trackingFile = ".supajump/plugins.json"

  async addPlugin(plugin: TrackedPlugin): Promise<void>
  async removePlugin(name: string): Promise<void>
  async getPlugin(name: string): Promise<TrackedPlugin | null>
  async listPlugins(): Promise<TrackedPlugin[]>
  async markFileModified(pluginName: string, filePath: string): Promise<void>
}
```

### 4. Update Manager

```typescript
// src/lib/plugins/updater.ts
export class PluginUpdater {
  constructor(
    private registry: Registry,
    private tracker: PluginTracker,
    private differ: FileDiffer,
    private shadcnInstaller: ShadcnInstaller
  ) {}

  async checkUpdates(pluginName?: string): Promise<UpdateInfo[]> {
    // Compare installed versions with registry
  }

  async update(pluginName: string, options: UpdateOptions): Promise<UpdateResult> {
    // 1. Download new version
    // 2. Check for new shadcn dependencies
    // 3. Compare files
    // 4. Handle conflicts
    // 5. Install new shadcn components
    // 6. Apply updates
    // 7. Run new migrations
    // 8. Update npm dependencies
  }

  private async handleConflict(
    file: FileConflict,
    strategy: ConflictStrategy
  ): Promise<ConflictResolution> {
    // Merge, keep, overwrite logic
  }
}
```

### 5. shadcn Component Installer

```typescript
// src/lib/plugins/shadcn.ts
export class ShadcnInstaller {
  constructor(private projectRoot: string) {}

  async checkInstalled(components: string[]): Promise<{
    installed: string[]
    missing: string[]
  }> {
    // Check src/components/ui for existing components
    const installed = []
    const missing = []
    
    for (const component of components) {
      const path = `${this.projectRoot}/src/components/ui/${component}.tsx`
      if (await fileExists(path)) {
        installed.push(component)
      } else {
        missing.push(component)
      }
    }
    
    return { installed, missing }
  }

  async installComponents(components: string[]): Promise<void> {
    const { missing } = await this.checkInstalled(components)
    
    if (missing.length > 0) {
      const cmd = `npx shadcn-ui@latest add ${missing.join(' ')}`
      await exec(cmd, { cwd: this.projectRoot })
    }
  }

  async removeUnusedComponents(pluginName: string): Promise<void> {
    // Check if any other plugins use these components
    // Only remove if no other plugins depend on them
  }
}
```

### 6. File Differ

```typescript
// src/lib/plugins/differ.ts
export class FileDiffer {
  async compareFiles(
    original: string,
    current: string,
    updated: string
  ): Promise<DiffResult> {
    // 3-way merge logic
    // Detect conflict types
    // Generate patch
  }

  async canAutoMerge(diff: DiffResult): boolean {
    // Check if changes are in different parts
  }

  async merge(
    original: string,
    current: string,
    updated: string
  ): Promise<MergeResult> {
    // Attempt automatic merge
    // Return conflicts if any
  }
}
```

## Command Implementations

### Create Command

```typescript
// src/commands/plugins/create.ts
import prompts from 'prompts'
import { PluginGenerator } from '../../lib/plugins/generator'

export async function create(options: CreateOptions) {
  // Interactive prompts
  const answers = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Plugin name:',
      validate: (value) => /^[a-z0-9-]+$/.test(value) || 'Use lowercase letters, numbers, and hyphens only'
    },
    {
      type: 'text',
      name: 'description',
      message: 'Description:'
    },
    {
      type: 'text',
      name: 'author',
      message: 'Author:',
      initial: await getGitUser()
    },
    {
      type: 'select',
      name: 'type',
      message: 'Select plugin type:',
      choices: [
        { title: 'Full-stack (UI + Database)', value: 'full-stack' },
        { title: 'UI only', value: 'ui' },
        { title: 'Database only', value: 'database' }
      ]
    },
    {
      type: 'select',
      name: 'template',
      message: 'Select a template:',
      choices: [
        { title: 'Basic CRUD - Simple create, read, update, delete operations', value: 'basic-crud' },
        { title: 'Data Table - Advanced table with filtering, sorting, pagination', value: 'data-table' },
        { title: 'Form Builder - Complex forms with validation', value: 'form-builder' },
        { title: 'Dashboard Widget - Analytics or status display', value: 'dashboard-widget' },
        { title: 'Custom (blank) - Start from scratch', value: 'custom' }
      ]
    }
  ])

  if (answers.type !== 'database') {
    const shadcnComponents = await prompts({
      type: 'multiselect',
      name: 'components',
      message: 'Select shadcn components to include:',
      choices: getTemplateComponents(answers.template),
      initial: getDefaultComponents(answers.template)
    })
    answers.shadcnComponents = shadcnComponents.components
  }

  const features = await prompts({
    type: 'multiselect',
    name: 'features',
    message: 'Select features to include:',
    choices: [
      { title: 'TypeScript types', value: 'types', selected: true },
      { title: 'API queries (Tanstack Query)', value: 'queries', selected: true },
      { title: 'RLS policies template', value: 'rls', selected: answers.type !== 'ui' },
      { title: 'Real-time subscriptions', value: 'realtime' },
      { title: 'Permission checks', value: 'permissions', selected: true }
    ]
  })
  answers.features = features.features

  const generator = new PluginGenerator()
  const result = await generator.generate({
    ...answers,
    outputPath: `./${answers.name}`
  })

  console.log(`
✓ Plugin created successfully at ${result.path}

Next steps:
1. cd ${answers.name}
2. Review and customize the generated code
3. Test locally: supajump plugins add ../${answers.name}
4. Update README.md with your documentation
  `)
}
```

### Plugin Generator

```typescript
// src/lib/plugins/generator.ts
export class PluginGenerator {
  private templates: Map<string, TemplateConfig>

  constructor() {
    this.templates = new Map([
      ['basic-crud', basicCrudTemplate],
      ['data-table', dataTableTemplate],
      ['form-builder', formBuilderTemplate],
      ['dashboard-widget', dashboardTemplate],
      ['custom', customTemplate]
    ])
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const template = this.templates.get(options.template) || customTemplate
    
    // Create directory structure
    await this.createDirectoryStructure(options.outputPath, options.type)
    
    // Generate plugin.json
    await this.generatePluginJson(options)
    
    // Generate components
    if (options.type !== 'database') {
      await this.generateComponents(options, template)
    }
    
    // Generate hooks
    if (options.features.includes('queries')) {
      await this.generateHooks(options, template)
    }
    
    // Generate queries
    if (options.features.includes('queries')) {
      await this.generateQueries(options, template)
    }
    
    // Generate types
    if (options.features.includes('types')) {
      await this.generateTypes(options, template)
    }
    
    // Generate migrations
    if (options.type !== 'ui') {
      await this.generateMigrations(options, template)
    }
    
    // Generate examples
    await this.generateExamples(options, template)
    
    // Generate README
    await this.generateReadme(options)
    
    return { path: options.outputPath }
  }

  private async generatePluginJson(options: GenerateOptions) {
    const pluginJson = {
      name: options.name,
      version: "1.0.0",
      description: options.description,
      author: options.author,
      license: "MIT",
      type: options.type,
      template: options.template,
      files: this.getFileMapping(options),
      dependencies: {
        npm: this.getNpmDependencies(options),
        shadcn: options.shadcnComponents || []
      },
      migrations: options.type !== 'ui' ? this.getMigrations(options) : [],
      config: {
        permissions: this.getPermissions(options),
        settings: this.getSettings(options)
      }
    }
    
    await writeJson(
      path.join(options.outputPath, 'plugin.json'),
      pluginJson
    )
  }
}
```

### Template System

```typescript
// src/lib/plugins/templates/basic-crud.ts
export const basicCrudTemplate: TemplateConfig = {
  name: 'basic-crud',
  components: [
    {
      name: 'list.tsx',
      template: (options) => `
"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ${options.name}Keys } from "../queries/keys"
import { api } from "@/queries"
import { ${pascalCase(options.name)} } from "../types"

export function ${pascalCase(options.name)}List({ orgId, teamId }: { orgId: string; teamId: string }) {
  const supabase = createClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ${options.name}Keys.list(orgId, teamId),
    queryFn: () => api.${camelCase(options.name)}.getAll(supabase, orgId, teamId),
  })

  if (isLoading) return <${pascalCase(options.name)}ListSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">${titleCase(options.name)}</h2>
        <Button>Create New</Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm">Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
      `
    }
  ],
  queries: [
    {
      name: 'queries.ts',
      template: (options) => `
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types"

export const ${camelCase(options.name)}Queries = {
  async getAll(
    supabase: SupabaseClient<Database>,
    orgId: string,
    teamId: string
  ) {
    const { data, error } = await supabase
      .from("${options.tableName || options.name}")
      .select("*")
      .eq("org_id", orgId)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: Create${pascalCase(options.name)}Input
  ) {
    const { data: created, error } = await supabase
      .from("${options.tableName || options.name}")
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  },

  async update(
    supabase: SupabaseClient<Database>,
    id: string,
    data: Update${pascalCase(options.name)}Input
  ) {
    const { data: updated, error } = await supabase
      .from("${options.tableName || options.name}")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return updated
  },

  async delete(
    supabase: SupabaseClient<Database>,
    id: string
  ) {
    const { error } = await supabase
      .from("${options.tableName || options.name}")
      .delete()
      .eq("id", id)

    if (error) throw error
  }
}
      `
    }
  ],
  migrations: [
    {
      name: '001_create_table.sql',
      template: (options) => `
CREATE TABLE IF NOT EXISTS ${options.tableName || options.name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  org_id UUID NOT NULL REFERENCES organizations(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ${options.tableName || options.name} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "rls_${options.tableName || options.name}_select" ON ${options.tableName || options.name} 
FOR SELECT TO authenticated USING (
  supajump.has_permission('${options.name}', 'view', org_id, team_id, owner_id)
);

CREATE POLICY "rls_${options.tableName || options.name}_insert" ON ${options.tableName || options.name} 
FOR INSERT TO authenticated WITH CHECK (
  supajump.has_permission('${options.name}', 'create', org_id, team_id, owner_id)
);

CREATE POLICY "rls_${options.tableName || options.name}_update" ON ${options.tableName || options.name} 
FOR UPDATE TO authenticated WITH CHECK (
  supajump.has_permission('${options.name}', 'edit', org_id, team_id, owner_id)
);

CREATE POLICY "rls_${options.tableName || options.name}_delete" ON ${options.tableName || options.name} 
FOR DELETE TO authenticated WITH CHECK (
  supajump.has_permission('${options.name}', 'delete', org_id, team_id, owner_id)
);
      `
    }
  ]
}
```

### Add Command

```typescript
// src/commands/plugins/add.ts
export async function add(pluginName: string, options: AddOptions) {
  const spinner = ora("Checking plugin requirements...").start()
  
  try {
    const installer = new PluginInstaller(
      registry, 
      process.cwd(), 
      tracker,
      shadcnInstaller
    )
    
    // Pre-flight checks
    const validation = await installer.validate(pluginName, options.version)
    if (!validation.success) {
      spinner.fail()
      console.error(validation.errors)
      return
    }

    // Show what will be installed
    spinner.stop()
    console.log("\nThe following will be installed:")
    
    if (validation.shadcnComponents.length > 0) {
      console.log("\nshadcn components:")
      validation.shadcnComponents.forEach(c => console.log(`  - ${c}`))
    }
    
    console.log("\nPlugin files:")
    validation.files.forEach(f => console.log(`  ${f}`))
    
    const confirm = await prompts({
      type: "confirm",
      name: "value",
      message: "Continue?",
      initial: true
    })
    
    if (!confirm.value) return

    spinner.text = "Installing plugin..."
    spinner.start()
    
    const result = await installer.install(pluginName, options.version)
    
    spinner.succeed(`Plugin "${pluginName}" installed successfully!`)
    
    // Show post-install instructions
    if (result.instructions) {
      console.log("\nNext steps:")
      console.log(result.instructions)
    }
  } catch (error) {
    spinner.fail()
    console.error("Failed to install plugin:", error.message)
  }
}
```

### Update Command

```typescript
// src/commands/plugins/update.ts
export async function update(pluginName: string, options: UpdateOptions) {
  const updater = new PluginUpdater(
    registry, 
    tracker, 
    differ,
    shadcnInstaller
  )
  
  // Check for updates
  const updates = await updater.checkUpdates(pluginName)
  if (updates.length === 0) {
    console.log("All plugins are up to date!")
    return
  }

  // Show update info
  for (const update of updates) {
    console.log(`${update.name}: ${update.currentVersion} → ${update.newVersion}`)
    if (update.newShadcnDeps?.length > 0) {
      console.log(`  New shadcn components: ${update.newShadcnDeps.join(', ')}`)
    }
    if (update.changelog) {
      console.log(`  ${update.changelog}`)
    }
  }

  // Confirm update
  if (!options.yes) {
    const confirm = await prompts({
      type: "confirm",
      name: "value",
      message: "Proceed with updates?",
    })
    if (!confirm.value) return
  }

  // Perform updates
  for (const update of updates) {
    await performUpdate(update, updater, options)
  }
}
```

## Configuration

### Project Configuration

```json
// .supajump/config.json
{
  "plugins": {
    "registry": "https://registry.supajump.com",
    "autoUpdate": false,
    "checkUpdatesOnStart": true
  }
}
```

### Plugin Tracking

```json
// .supajump/plugins.json
{
  "version": 1,
  "plugins": {
    "rich-editor": {
      "version": "1.0.0",
      "installedAt": "2024-01-15T10:00:00Z",
      "files": [
        {
          "source": "components/rich-editor.tsx",
          "target": "src/features/rich-editor/components/rich-editor.tsx",
          "hash": "abc123...",
          "modified": false
        }
      ],
      "migrations": ["001"],
      "npmDependencies": ["@tiptap/react@2.1.0"],
      "shadcnComponents": ["button", "dropdown-menu", "separator", "tooltip"]
    }
  }
}
```

## Error Handling

### Common Errors

```typescript
export class PluginError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message)
  }
}

export enum ErrorCode {
  ALREADY_INSTALLED = "ALREADY_INSTALLED",
  VERSION_CONFLICT = "VERSION_CONFLICT",
  MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
  MIGRATION_FAILED = "MIGRATION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_PLUGIN = "INVALID_PLUGIN",
  SHADCN_INSTALL_FAILED = "SHADCN_INSTALL_FAILED",
}
```

## Testing Strategy

### Unit Tests

```typescript
// Test registry client
describe("Registry", () => {
  it("fetches plugin index", async () => {
    const registry = new MockRegistry()
    const index = await registry.getIndex()
    expect(index.plugins).toHaveLength(3)
  })
})

// Test installer
describe("PluginInstaller", () => {
  it("validates dependencies before install", async () => {
    const installer = new PluginInstaller(registry, tmpDir, tracker, shadcnInstaller)
    const result = await installer.validate("rich-editor")
    expect(result.success).toBe(true)
  })
})

// Test shadcn integration
describe("ShadcnInstaller", () => {
  it("detects missing components", async () => {
    const installer = new ShadcnInstaller(tmpDir)
    const { missing } = await installer.checkInstalled(["button", "dialog"])
    expect(missing).toContain("dialog")
  })
})
```

### Integration Tests

```typescript
// Test full install flow
describe("Plugin Installation", () => {
  it("installs a plugin with shadcn dependencies", async () => {
    const result = await cli.run(["plugins", "add", "rich-editor"])
    
    expect(result.exitCode).toBe(0)
    expect(fs.existsSync("src/features/rich-editor")).toBe(true)
    expect(fs.existsSync("src/components/ui/button.tsx")).toBe(true)
    expect(tracker.getPlugin("rich-editor")).toBeTruthy()
  })
})
```

## Future Enhancements

1. **Plugin Development Kit**: Tools for creating and testing plugins locally
2. **Version Constraints**: Support for version ranges and compatibility
3. **Rollback Support**: Ability to rollback failed updates
4. **Dependency Resolution**: Automatic resolution of plugin dependencies
5. **Caching**: Local cache for faster repeated installs
6. **Parallel Operations**: Install/update multiple plugins concurrently
7. **shadcn Theme Support**: Handle different shadcn theme configurations
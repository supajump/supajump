#!/usr/bin/env node

import { program } from "commander"
import { intro, outro, text, select, confirm, spinner, cancel, isCancel } from "@clack/prompts"
import chalk from "chalk"
import { execa } from "execa"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type PackageManager = "npm" | "pnpm" | "yarn"

const validateProjectName = (name: string): boolean => {
  return /^[a-z0-9-]+$/.test(name)
}

const detectPackageManager = (): PackageManager => {
  const userAgent = process.env.npm_config_user_agent || ""
  
  if (userAgent.includes("pnpm")) return "pnpm"
  if (userAgent.includes("yarn")) return "yarn"
  return "npm"
}


const getRunCommand = (pm: PackageManager, script: string): string => {
  return pm === "npm" ? `npm run ${script}` : `${pm} ${script}`
}

async function copyTemplate(projectPath: string) {
  const templatePath = path.join(__dirname, "..", "..", "..")
  
  // Directories to copy
  const dirsToInclude = [
    "apps",
    "packages", 
    "supabase"
  ]
  
  // Files to copy from root
  const filesToInclude = [
    "turbo.json",
    "pnpm-workspace.yaml",
    ".gitignore",
    "README.md",
    "CLAUDE.md",
    "AGENTS.md"
  ]
  
  // Create project directory
  await fs.ensureDir(projectPath)
  
  // Copy directories
  for (const dir of dirsToInclude) {
    const srcPath = path.join(templatePath, dir)
    const destPath = path.join(projectPath, dir)
    
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, destPath, {
        filter: (src) => {
          // Skip node_modules, .next, .turbo, and the CLI package itself
          const relativePath = path.relative(templatePath, src)
          return !relativePath.includes("node_modules") &&
                 !relativePath.includes(".next") &&
                 !relativePath.includes(".turbo") &&
                 !relativePath.includes("create-supajump-app")
        }
      })
    }
  }
  
  // Copy root files
  for (const file of filesToInclude) {
    const srcPath = path.join(templatePath, file)
    const destPath = path.join(projectPath, file)
    
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, destPath)
    }
  }
  
  // Create root package.json
  const rootPackageJson = {
    name: path.basename(projectPath),
    version: "0.1.0",
    private: true,
    description: "Multi-tenant SaaS application built with Supajump",
    scripts: {
      build: "turbo build",
      dev: "turbo dev",
      lint: "turbo lint",
      format: "prettier --write \"**/*.{ts,tsx,md}\"",
      "db:gen:types": "supabase gen types typescript --local > apps/app/src/lib/database.types.ts"
    },
    devDependencies: {
      prettier: "^3.4.2",
      turbo: "^2.3.3"
    },
    packageManager: "pnpm@9.15.1",
    engines: {
      node: ">=18"
    }
  }
  
  await fs.writeJson(path.join(projectPath, "package.json"), rootPackageJson, { spaces: 2 })
  
  // Update app package.json name
  const appPackageJsonPath = path.join(projectPath, "apps", "app", "package.json")
  if (await fs.pathExists(appPackageJsonPath)) {
    const appPackageJson = await fs.readJson(appPackageJsonPath)
    appPackageJson.name = `@${path.basename(projectPath)}/app`
    await fs.writeJson(appPackageJsonPath, appPackageJson, { spaces: 2 })
  }
  
  // Clean up any .git directory
  const gitPath = path.join(projectPath, ".git")
  if (await fs.pathExists(gitPath)) {
    await fs.remove(gitPath)
  }
}

async function createEnvFile(projectPath: string) {
  const envExample = `# Supabase
# Get these from your Supabase project settings
# For local development: http://localhost:54321
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Used for server-side operations
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site URL (update in production)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`

  await fs.writeFile(
    path.join(projectPath, "apps", "app", ".env.example"),
    envExample
  )
  
  await fs.writeFile(
    path.join(projectPath, "apps", "app", ".env.local"),
    envExample
  )
}

async function initGit(projectPath: string) {
  await execa("git", ["init"], { cwd: projectPath })
  await execa("git", ["add", "."], { cwd: projectPath })
  await execa("git", ["commit", "-m", "Initial commit from create-supajump-app"], { cwd: projectPath })
}

async function main() {
  program
    .name("create-supajump-app")
    .description("Create a new Supajump application")
    .version("0.1.0")
    .argument("[project-name]", "Name of the project")
    .parse()

  intro(chalk.cyan("Welcome to create-supajump-app!"))

  let projectName = program.args[0]

  // Get project name if not provided
  if (!projectName) {
    const nameResult = await text({
      message: "What is your project named?",
      placeholder: "my-supajump-app",
      validate: (value) => {
        if (!value) return "Project name is required"
        if (!validateProjectName(value)) {
          return "Project name must only contain lowercase letters, numbers, and hyphens"
        }
        return undefined
      }
    })

    if (isCancel(nameResult)) {
      cancel("Installation cancelled")
      process.exit(0)
    }

    projectName = nameResult as string
  }

  const projectPath = path.join(process.cwd(), projectName)

  // Check if directory exists
  if (await fs.pathExists(projectPath)) {
    cancel(`Directory ${projectName} already exists`)
    process.exit(1)
  }

  // Get package manager preference
  const defaultPm = detectPackageManager()
  const pmResult = await select({
    message: "Which package manager would you like to use?",
    options: [
      { value: "pnpm", label: "pnpm" + (defaultPm === "pnpm" ? " (detected)" : "") },
      { value: "npm", label: "npm" + (defaultPm === "npm" ? " (detected)" : "") },
      { value: "yarn", label: "yarn" + (defaultPm === "yarn" ? " (detected)" : "") }
    ],
    initialValue: defaultPm
  })

  if (isCancel(pmResult)) {
    cancel("Installation cancelled")
    process.exit(0)
  }

  const packageManager = pmResult as PackageManager

  // Ask about Git
  const gitResult = await confirm({
    message: "Initialize a new git repository?",
    initialValue: true
  })

  if (isCancel(gitResult)) {
    cancel("Installation cancelled")
    process.exit(0)
  }

  const gitInit = gitResult as boolean

  // Ask about dependencies
  const depsResult = await confirm({
    message: "Install dependencies?",
    initialValue: true
  })

  if (isCancel(depsResult)) {
    cancel("Installation cancelled")
    process.exit(0)
  }

  const installDependencies = depsResult as boolean

  // Start setup
  const setupSpinner = spinner()
  setupSpinner.start("Creating your project...")

  try {
    // Copy template
    await copyTemplate(projectPath)
    setupSpinner.stop("Project files created")

    // Create env files
    setupSpinner.start("Creating environment files...")
    await createEnvFile(projectPath)
    setupSpinner.stop("Environment files created")

    // Initialize git
    if (gitInit) {
      setupSpinner.start("Initializing git repository...")
      await initGit(projectPath)
      setupSpinner.stop("Git repository initialized")
    }

    // Install dependencies
    if (installDependencies) {
      setupSpinner.start(`Installing dependencies with ${packageManager}...`)
      await execa(packageManager, ["install"], { cwd: projectPath })
      setupSpinner.stop("Dependencies installed")
    }

    outro(chalk.green("✨ Your project is ready!"))

    console.log()
    console.log(chalk.bold("Next steps:"))
    console.log()
    console.log(chalk.cyan(`  cd ${projectName}`))
    console.log()
    console.log(chalk.gray("  # Set up your Supabase credentials"))
    console.log(chalk.cyan(`  ${packageManager === "npm" ? "nano" : "$EDITOR"} apps/app/.env.local`))
    console.log()
    console.log(chalk.gray("  # Start local Supabase"))
    console.log(chalk.cyan("  supabase start"))
    console.log()
    console.log(chalk.gray("  # Start development server"))
    console.log(chalk.cyan(`  ${getRunCommand(packageManager, "dev")}`))
    console.log()
    console.log(chalk.gray("  For more information, check out:"))
    console.log(chalk.cyan("  https://github.com/supajump/supajump"))
    console.log()

  } catch (error) {
    setupSpinner.stop("Setup failed")
    console.error(chalk.red("Error:"), error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error)
  process.exit(1)
})
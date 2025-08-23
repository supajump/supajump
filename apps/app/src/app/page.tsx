"use client"

import { GlobeIcon } from "lucide-react"
import React, { useState } from "react"

export default function SupajumpLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-zinc-100">
      <Header />
      <Hero />
      <Logos />
      <FeatureGrid />
      <HowItWorks />
      <CodeShowcase />
      <FAQ />
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70 border-b border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 text-emerald-400 transform -rotate-140" />
          <div className="flex items-center">
            <span className="font-semibold tracking-tight">Supa</span>
            <span className="text-emerald-400 font-bold">jump</span>
          </div>
          <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-700/40">
            Multi‑tenant SaaS Starter
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#how" className="hover:text-white">
            How it works
          </a>
          <a href="#code" className="hover:text-white">
            Code
          </a>
          <a href="#faq" className="hover:text-white">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/supajump/supajump"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-xl border border-zinc-700/70 bg-zinc-900 px-3 py-2 text-sm font-medium hover:border-zinc-600 hover:bg-zinc-900/70"
          >
            <GitHubIcon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
            <span>Star on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackdropGlow />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-600/10 px-3 py-1 text-emerald-300 text-xs">
          <SparkleIcon className="h-3.5 w-3.5" />
          Next.js 15 + Supabase • RLS‑first • TanStack Query
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
          Ship a real multi‑tenant SaaS in days,{" "}
          <span className="text-emerald-400">not months</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-zinc-300">
          Supajump gives you Organizations → Teams → Users, dynamic RBAC with
          Row‑Level Security, RSC‑first data fetching, and a batteries‑included
          DX — all wired up in a Turborepo.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-medium text-black hover:bg-emerald-400"
          >
            Get Started
          </a>
          <CopyButton
            label="Create a Supajump app"
            toCopy={"pnpm create supajump-app my-app"}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/70 bg-zinc-900 px-5 py-3 font-medium hover:border-zinc-600"
          >
            <TerminalIcon className="h-4 w-4" />
            pnpm create supajump-app my-app
          </CopyButton>
          <a
            href="https://github.com/supajump/supajump#readme"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/70 bg-zinc-900 px-5 py-3 font-medium hover:border-zinc-600"
          >
            <BookIcon className="h-4 w-4" />
            Read the README
          </a>
        </div>
        <div className="mt-6 text-xs text-zinc-400">
          Works great locally:{" "}
          <code className="rounded bg-zinc-900/60 px-2 py-1">
            supabase start
          </code>{" "}
          + <code className="rounded bg-zinc-900/60 px-2 py-1">pnpm dev</code>
        </div>
      </div>
    </section>
  )
}

function Logos() {
  return (
    <section className="border-y border-zinc-800/60 bg-zinc-950/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-xs uppercase tracking-widest text-zinc-400">
          Powered by your favorite stack
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 opacity-80">
          <TechBadge name="Next.js 15" />
          <TechBadge name="Supabase" />
          <TechBadge name="Postgres RLS" />
          <TechBadge name="TanStack Query" />
          <TechBadge name="Turborepo" />
          <TechBadge name="Tailwind" />
        </div>
      </div>
    </section>
  )
}

function FeatureGrid() {
  const features = [
    {
      title: "True Multi‑Tenancy",
      body: "Organizations → Teams → Users with memberships and role assignments. Clean tenant isolation and sane defaults.",
      icon: <BuildingIcon className="h-5 w-5" />,
      chip: "Tenant model",
    },
    {
      title: "Dynamic RBAC + RLS",
      body: "Permission = resource + action + scope (all/own). Enforced via Postgres Row Level Security and helper RPCs.",
      icon: <ShieldIcon className="h-5 w-5" />,
      chip: "Security",
    },
    {
      title: "RSC‑first Data",
      body: "React Server Components with server‑side prefetch + client hydration using TanStack Query.",
      icon: <RocketIcon className="h-5 w-5" />,
      chip: "Performance",
    },
    {
      title: "Feature‑based Codebase",
      body: "Organized by feature folders with colocated components, hooks, queries, and types.",
      icon: <FolderIcon className="h-5 w-5" />,
      chip: "DX",
    },
    {
      title: "CLI Scaffolder",
      body: "npx/pnpm create to bootstrap a new project with env scaffolding and clear next steps.",
      icon: <TerminalIcon className="h-5 w-5" />,
      chip: "CLI",
    },
    {
      title: "Polished UX",
      body: "Skeleton loaders, react‑hook‑form + zod, and sensible defaults for a production‑ready feel.",
      icon: <SparkleIcon className="h-5 w-5" />,
      chip: "UX",
    },
  ]

  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20"
    >
      <h2 className="text-center text-3xl sm:text-4xl font-semibold tracking-tight">
        Everything you actually need
      </h2>
      <p className="mt-3 text-center text-zinc-300 max-w-2xl mx-auto">
        Supajump packages the hard parts so you can focus on your product: auth,
        permissions, data fetching, and a maintainable file structure.
      </p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5"
          >
            <div className="mb-3 inline-flex items-center gap-2">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-700/30">
                {f.icon}
              </div>
              <span className="text-xs rounded-full border border-zinc-700/60 px-2 py-0.5 text-zinc-300">
                {f.chip}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-zinc-300">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h4 className="font-semibold">Monorepo, organized</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300 list-disc pl-5">
            <li>
              <code>/apps/app</code> – Next.js application
            </li>
            <li>
              <code>/packages/create-supajump-app</code> – CLI scaffold
            </li>
            <li>
              <code>/packages/*</code> – shared packages
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h4 className="font-semibold">Code conventions</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-300 list-disc pl-5">
            <li>No semicolons, double quotes</li>
            <li>Strict import ordering (Prettier)</li>
            <li>
              Path aliases: <code>@/*</code>, <code>@features/*</code>
            </li>
            <li>
              Environment validation in <code>env.mjs</code>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      title: "Create",
      body: "Scaffold a new project with the CLI.",
      code: "pnpm create supajump-app my-app",
    },
    {
      title: "Develop",
      body: "Run Supabase + the app locally.",
      code: "supabase start\npnpm dev",
    },
    {
      title: "Ship",
      body: "Build with confidence. RBAC + RLS are already wired in.",
      code: "pnpm build",
    },
  ]

  return (
    <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <h2 className="text-center text-3xl sm:text-4xl font-semibold tracking-tight">
        From zero to tenant‑aware in three steps
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6"
          >
            <div className="text-sm text-zinc-400">Step {i + 1}</div>
            <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-zinc-300">{s.body}</p>
            <CopyInline className="mt-4" value={s.code} />
          </div>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-3 gap-6 text-sm text-zinc-300">
        <MiniCard title="Type‑safe DB">
          Database types auto‑generated to{" "}
          <code>apps/app/src/lib/database.types.ts</code>.
        </MiniCard>
        <MiniCard title="Feature folders">
          Colocate UI, hooks, queries, and types under{" "}
          <code>/features/[name]</code>.
        </MiniCard>
        <MiniCard title="Query cache keys">
          Centralized keys in <code>/apps/app/src/queries/keys.ts</code> for
          proper invalidation.
        </MiniCard>
      </div>
    </section>
  )
}

function CodeShowcase() {
  const prefetchRSC = `// RSC with server-side prefetch + hydration
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { getQueryClient } from "@/components/providers/get-query-client"
import { api } from "@/queries"
import { postsKeys } from "@/queries/keys"

export default async function Page({ params }) {
  const supabase = await createClient()
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsTable orgId={orgId} teamId={teamId} />
    </HydrationBoundary>
  )
}`

  const rlsTemplate = `-- RLS helper pattern (simplified)
CREATE POLICY "rls_<table>_select" ON <table>
FOR SELECT TO authenticated USING (
  supajump.has_permission('<table>', 'view', org_id, team_id, owner_id)
);

CREATE POLICY "rls_<table>_insert" ON <table>
FOR INSERT TO authenticated WITH CHECK (
  supajump.has_permission('<table>', 'create', org_id, team_id, owner_id)
);

CREATE POLICY "rls_<table>_update" ON <table>
FOR UPDATE TO authenticated WITH CHECK (
  supajump.has_permission('<table>', 'edit', org_id, team_id, owner_id)
);

CREATE POLICY "rls_<table>_delete" ON <table>
FOR DELETE TO authenticated WITH CHECK (
  supajump.has_permission('<table>', 'delete', org_id, team_id, owner_id)
);`

  const hooksSnippet = `// Client hook
export function usePosts(orgId, teamId) {
  const supabase = createClient()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  })
}`

  const dbCommands = `# Development
supabase start
pnpm dev

# Build / Lint
pnpm build
pnpm lint

# DB management
pnpm db:gen:types
supabase db push
supabase db reset`

  return (
    <section id="code" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <h2 className="text-center text-3xl sm:text-4xl font-semibold tracking-tight">
        Production patterns, pre‑wired
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-300">
        These are the real patterns the template ships with — not hand‑wavy
        pseudo‑code.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <CodeBlock
          label="RSC prefetch + hydrate (TypeScript)"
          code={prefetchRSC}
        />
        <CodeBlock label="RLS policy template (SQL)" code={rlsTemplate} />
        <CodeBlock label="TanStack hook (TypeScript)" code={hooksSnippet} />
        <CodeBlock label="Essential commands (bash)" code={dbCommands} />
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h3 className="text-xl font-semibold">
          Feature skeletons, not spinners
        </h3>
        <p className="mt-2 text-sm text-zinc-300">
          Supajump ships with skeleton components that mirror layouts for
          instant perceived performance.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    {
      q: "Is Supajump framework‑opinionated?",
      a: "Yes — Next.js 15, React Server Components, TanStack Query, Tailwind. The goal is speed to a solid baseline without bikeshedding.",
    },
    {
      q: "How does authorization work?",
      a: "Roles and permissions are stored in Postgres. A helper function checks resource, action, and scope (own/all) to enforce RLS across tables.",
    },
    {
      q: "Can I extend the data model?",
      a: "Yes. Follow the RLS policy template and use the feature folder pattern to add tables, queries, and UI with minimal friction.",
    },
    {
      q: "Where do queries live?",
      a: "All queries are centralized in /apps/app/src/queries and exposed via an api object for consistency and testability.",
    },
    {
      q: "Local dev flow?",
      a: "Run supabase start, then pnpm dev. After schema changes, run pnpm db:gen:types to refresh types.",
    },
  ]

  return (
    <section id="faq" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
      <h2 className="text-center text-3xl sm:text-4xl font-semibold tracking-tight">
        FAQ
      </h2>
      <div className="mt-8 divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-zinc-950/60">
        {items.map((it, i) => (
          <details key={i} className="group open:bg-zinc-950/60">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left">
              <span className="font-medium">{it.q}</span>
              <span className="text-zinc-400 group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="px-6 pb-6 text-sm text-zinc-300">{it.a}</div>
          </details>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-3">
        <CopyButton
          label="Install CLI"
          toCopy={"pnpm create supajump-app my-app"}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-medium text-black hover:bg-emerald-400"
        >
          <TerminalIcon className="h-4 w-4" />
          pnpm create supajump-app my-app
        </CopyButton>
        <a
          href="https://github.com/supajump/supajump"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/70 bg-zinc-900 px-5 py-3 font-medium hover:border-zinc-600"
        >
          <GitHubIcon className="h-4 w-4" />
          View on GitHub
        </a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 opacity-80" />
          <span>Supajump • Multi‑tenant SaaS starter • Next.js + Supabase</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hover:text-zinc-200">
            Features
          </a>
          <a href="#how" className="hover:text-zinc-200">
            How it works
          </a>
          <a href="#code" className="hover:text-zinc-200">
            Code
          </a>
          <a
            href="https://github.com/supajump/supajump"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

/* --------------------------- UI PRIMITIVES ---------------------------- */

function BackdropGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div className="absolute right-[10%] top-[20%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-3xl"></div>
      <div className="absolute left-[10%] bottom-[10%] h-[20rem] w-[20rem] rounded-full bg-fuchsia-500/10 blur-3xl"></div>
    </div>
  )
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 text-sm text-zinc-300">
      {name}
    </div>
  )
}

function MiniCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-2 text-sm text-zinc-300">{children}</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded bg-zinc-800"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-800"></div>
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800"></div>
        </div>
        <div className="h-8 w-20 animate-pulse rounded bg-zinc-800"></div>
      </div>
    </div>
  )
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="text-xs text-zinc-400">{label}</div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {}
          }}
          className="text-xs rounded-lg border border-zinc-700/70 bg-zinc-900 px-2 py-1 hover:border-zinc-600"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-auto p-4 text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CopyButton({
  label,
  toCopy,
  className = "",
  children,
}: {
  label?: string
  toCopy: string
  className?: string
  children: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(toCopy)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        } catch {}
      }}
      aria-label={label || "Copy command"}
      className={className}
    >
      <span className="sr-only">{label || "Copy"}</span>
      <span className="inline-flex items-center gap-2">{children}</span>
      <span className="ml-2 text-xs opacity-80">
        {copied ? "✓ Copied" : "Copy"}
      </span>
    </button>
  )
}

function CopyInline({
  value,
  className = "",
}: {
  value: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 ${className}`}
    >
      <code className="text-xs text-zinc-200 whitespace-pre">{value}</code>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1400)
          } catch {}
        }}
        className="text-xs rounded-lg border border-zinc-700/70 bg-zinc-900 px-2 py-1 hover:border-zinc-600"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}

/* ----------------------------- ICONS (SVG) ---------------------------- */

function LogoMark({ className = "" }: { className?: string }) {
  return (
    // <svg viewBox="0 0 24 24" className={className} aria-hidden>
    //   <defs>
    //     <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    //       <stop offset="0%" stopColor="#34d399" />
    //       <stop offset="100%" stopColor="#22d3ee" />
    //     </linearGradient>
    //   </defs>
    //   <rect
    //     x="2"
    //     y="2"
    //     width="20"
    //     height="20"
    //     rx="5"
    //     fill="url(#g)"
    //     opacity="0.2"
    //   />
    //   <path
    //     d="M6 16l4-8 4 8m-1.5-3h-5"
    //     stroke="url(#g)"
    //     strokeWidth="2"
    //     fill="none"
    //     strokeLinecap="round"
    //     strokeLinejoin="round"
    //   />
    // </svg>
    <GlobeIcon className={className} />
  )
}

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.9-.63.07-.62.07-.62 1 .07 1.52 1.05 1.52 1.05.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.09 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.7 0 0 .85-.28 2.79 1.05.81-.23 1.68-.34 2.54-.34.86 0 1.73.11 2.54.34 1.94-1.33 2.79-1.05 2.79-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.76 0 3.96-2.34 4.82-4.58 5.08.36.32.68.95.68 1.92 0 1.39-.01 2.52-.01 2.87 0 .27.18.6.68.49A10.06 10.06 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

function TerminalIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v12h16V6H4Zm3.7 2.3 1.6 1.6-1.6 1.6a1 1 0 0 0 1.4 1.4l2.3-2.3a1 1 0 0 0 0-1.4L9.1 6.9A1 1 0 0 0 7.7 8.3ZM11 15h4a1 1 0 1 0 0-2h-4a1 1 0 1 0 0 2Z" />
    </svg>
  )
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M5 3h9a4 4 0 0 1 4 4v12.5a1.5 1.5 0 0 1-2.25 1.3L12 18.8l-3.75 2a1.5 1.5 0 0 1-2.25-1.3V7a4 4 0 0 1 4-4Z" />
    </svg>
  )
}

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Zm-5 14-.9 2.4L3 19l2.4.6L6 22l.6-2.4L9 19l-2.4-.6L7 16Z" />
    </svg>
  )
}

function BuildingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 3h10a2 2 0 0 1 2 2v3h4a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h6V5H6v2Zm0 4h6V9H6v2Zm0 4h6v-2H6v2Z" />
    </svg>
  )
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Zm0 2.2 6 2.2v4.6c0 4-2.6 7.4-6 9.4-3.4-2-6-5.4-6-9.4V6.4l6-2.2Zm0 3.8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  )
}

function RocketIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2c3.9 0 6 2.6 6 7.7 0 1.6-.3 3.2-.9 4.8l3.1 3.1a1 1 0 0 1-1.4 1.4l-3.1-3.1c-1.6.6-3.2.9-4.8.9C6.6 16.8 4 14.7 4 10.8 4 4.6 8.1 2 12 2Zm0 2c-2.8 0-6 1.3-6 6.8 0 3 1.9 4.9 6 4.9s6-1.9 6-4.9C18 5.3 14.8 4 12 4Zm-5 13.5-1.5 1.5a2 2 0 1 0 2.8 2.8L9.8 20c-1-.1-2-.2-2.8-.5Z" />
    </svg>
  )
}

function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M3 5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V5Zm0 3h20v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
    </svg>
  )
}

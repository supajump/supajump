import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    APP_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE: z.string().min(1),
    EMAIL_API_KEY: z.string().min(1),
    EMAIL_PROVIDER: z.enum(["ses", "resend"]).default("ses"),
    RESEND_API_KEY: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    APP_URL: process.env.APP_URL,
    SUPABASE_SERVICE_ROLE:
      process.env.SUPABASE_SERVICE_ROLE ?? process.env.SERVICE_ROLE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})

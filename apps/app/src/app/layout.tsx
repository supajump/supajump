import QueryProvider from "@/components/providers/query-provider"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Supajump - Multi-tenant SaaS Starter Kit",
  description:
    "Supabase and Next.js multi-tenant SaaS starter kit with Organizations, Teams, RBAC, and more.",
  openGraph: {
    title: "Supajump - Multi-tenant SaaS Starter Kit",
    description:
      "Supabase and Next.js multi-tenant SaaS starter kit with Organizations, Teams, RBAC, and more.",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}

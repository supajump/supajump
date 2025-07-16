'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { getQueryClient } from './get-query-client'

export default function QueryProvider({
  children,
}: {
  children: ReactNode
}) {
  const queryClient = getQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

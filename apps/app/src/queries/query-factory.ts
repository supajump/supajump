import type { SupabaseClient } from '@supabase/supabase-js'
import { entities } from './entities'
import { queryOptions } from '@tanstack/react-query'
import stringify from 'fast-json-stable-stringify'
import { Database } from '@/lib/database.types'

type EntityKey = keyof typeof entities

// Helper for inferring the row type from the config (trick using typeof)
type InferRowType<E> = E extends { rowType: infer T } ? T : never
type InferInsertType<E> = E extends { insertType: infer T } ? T : never
type InferUpdateType<E> = E extends { updateType: infer T } ? T : never

type Filter<T> = Partial<T>
type Sort<T> = keyof T & string

export type QueryOpts<T> = {
  filters?: Filter<T>
  sort?: Sort<T>
  sortDirection?: 'asc' | 'desc'
  page?: number
  perPage?: number
  count?: boolean
  joins?: (string)[]
}

export class SupabaseEntityClient<DB> {
  constructor(private client: SupabaseClient<DB>) {}

  async findMany<
    K extends EntityKey,
    JoinKeys extends (keyof typeof entities[K]['joins'])[] = []
  >(
    entityKey: K,
    opts: QueryOpts<InferRowType<typeof entities[K]>> & { joins?: JoinKeys }
  ): Promise<{
    data: unknown[]
    count: number | null
  }> {
    const entity = entities[entityKey]
    let select = '*'
    if (opts.joins && opts.joins.length) {
      const joinSelects = opts.joins
        .map((j) => (entity.joins as Record<string, { select?: string }>)[j]?.select)
        .filter(Boolean)
      if (joinSelects.length) select += ', ' + joinSelects.join(', ')
    }
    let query = this.client
      .from(entity.table)
      .select(select, { count: opts.count ? 'exact' : undefined })

    if (opts.filters) {
      for (const [key, value] of Object.entries(opts.filters)) {
        if (value === undefined) continue
        if (Array.isArray(value)) query = query.in(key, value)
        else query = query.eq(key, value)
      }
    }
    if (opts.sort) {
      query = query.order(opts.sort, { ascending: opts.sortDirection !== 'desc' })
    }
    if (opts.page !== undefined && opts.perPage !== undefined) {
      const from = opts.page * opts.perPage
      const to = from + opts.perPage - 1
      query = query.range(from, to)
    }
    const { data, count, error } = await query
    if (error) throw error
    return { data: data ?? [], count } as { data: unknown[]; count: number | null }
  }

  // Mutations

  async create<K extends EntityKey>(
    entityKey: K,
    input: Omit<InferInsertType<typeof entities[K]>, 'id' | 'created_at' | 'updated_at'>
  ): Promise<InferRowType<typeof entities[K]>> {
    const entity = entities[entityKey]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.client.from(entity.table).insert(input as any).select().single()
    if (error) throw error
    return data as InferRowType<typeof entities[K]>
  }

  async update<K extends EntityKey>(
    entityKey: K,
    id: string,
    input: Omit<InferUpdateType<typeof entities[K]>, 'id' | 'created_at' | 'updated_at'>
  ): Promise<InferRowType<typeof entities[K]>> {
    const entity = entities[entityKey]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.client.from(entity.table).update(input as any).eq('id', id as any).select().single()
    if (error) throw error
    return data as InferRowType<typeof entities[K]>
  }

  async delete<K extends EntityKey>(
    entityKey: K,
    id: string
  ): Promise<void> {
    const entity = entities[entityKey]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await this.client.from(entity.table).delete().eq('id', id as any)
    if (error) throw error
  }
}


export function queryOptionsFactory<K extends keyof typeof entities>(
    supabaseEntityClient: SupabaseEntityClient<Database>, 
    table: K, 
    options: QueryOpts<InferRowType<(typeof entities)[K]>> & { joins?: (keyof (typeof entities)[K]['joins'])[] }
  ) {
    return queryOptions({
      queryKey: [table, stringify(options)],
      queryFn: () => supabaseEntityClient.findMany(table, options),
    })
  }

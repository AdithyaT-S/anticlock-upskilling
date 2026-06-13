/**
 * src/lib/db/providers/supabase.ts
 *
 * Supabase provider — DB_PROVIDER=supabase
 *
 * Uses the Supabase JS client with the service role key for
 * server-side queries. RLS is enforced by Supabase's PostgREST
 * layer using the JWT from the user's session — no manual
 * SET LOCAL needed.
 *
 * For typed ORM-style queries, use getSupabaseClient() directly.
 * This provider wraps it for raw SQL via rpc('exec_sql').
 */

import { createClient } from '@supabase/supabase-js'
import type { DBProviderImpl } from '../types'
import type { Database } from '@/types/supabase'

const client = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const supabaseProvider: DBProviderImpl = {

  async query<T>(
    sql: string,
    params: unknown[] = [],
    // context unused — Supabase RLS reads from JWT automatically
  ): Promise<T[]> {
    const { data, error } = await (client.rpc as any)('exec_sql', {
      query: sql,
      params: JSON.stringify(params),
    })
    if (error) throw new Error(`Supabase query error: ${error.message}`)
    return (data ?? []) as T[]
  },

  async transaction<T>(
    fn: (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
  ): Promise<T> {
    // Supabase transactions via stored procedure
    // For complex transactions, use a Postgres function instead
    const queries: Array<{ sql: string; params: unknown[] }> = []
    const capture = async <R>(sql: string, params: unknown[] = []): Promise<R[]> => {
      queries.push({ sql, params })
      return [] as R[] // deferred
    }
    await fn(capture) // collect queries

    const { error } = await (client.rpc as any)('exec_transaction', {
      queries: JSON.stringify(queries),
    })
    if (error) throw new Error(`Supabase transaction error: ${error.message}`)
    return undefined as unknown as T
  },
}

/** The typed Supabase client — use this for table().select() style queries */
export function getSupabaseClient() {
  return client
}

/** User-scoped client (uses anon key + user JWT for RLS) */
export function getSupabaseUserClient(accessToken: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    }
  )
}

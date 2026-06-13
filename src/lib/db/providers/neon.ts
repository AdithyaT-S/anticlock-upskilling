/**
 * src/lib/db/providers/neon.ts
 *
 * Neon serverless provider — DB_PROVIDER=neon
 *
 * Uses Neon's HTTP driver (@neondatabase/serverless) which works
 * in Vercel Edge Functions and standard Node.js.
 *
 * RLS: set_config() works over HTTP in Neon. We set org context
 * the same way as the pg provider.
 */

import { neon, neonConfig } from '@neondatabase/serverless'
import type { DBProviderImpl, OrgContext } from '../types'

// Enable WebSocket pooling for better performance in serverless
neonConfig.fetchConnectionCache = true

const sql = neon(process.env.DATABASE_URL!)
const useRLS = process.env.DB_USE_RLS !== 'false'

async function setContext(ctx: OrgContext) {
  if (!useRLS) return
  await sql`
    SELECT
      set_config('app.current_org_id',  ${ctx.orgId},  true),
      set_config('app.current_user_id', ${ctx.userId}, true)
  `
}

export const neonProvider: DBProviderImpl = {

  async query<T>(
    rawSql: string,
    params: unknown[] = [],
    context?: OrgContext
  ): Promise<T[]> {
    if (context) await setContext(context)
    // Neon uses tagged template literals natively.
    // For parameterized raw SQL, we use neon() with params array.
    const result = await sql.transaction([
      sql(rawSql, params as string[]),
    ])
    return (result[0] ?? []) as T[]
  },

  async transaction<T>(
    fn: (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
    context?: OrgContext
  ): Promise<T> {
    // Neon HTTP transactions are atomic
    const queries: Array<ReturnType<typeof sql>> = []

    if (context && useRLS) {
      queries.push(sql`
        SELECT
          set_config('app.current_org_id',  ${context.orgId},  true),
          set_config('app.current_user_id', ${context.userId}, true)
      `)
    }

    const capture = async <R>(rawSql: string, params: unknown[] = []): Promise<R[]> => {
      queries.push(sql(rawSql, params as string[]))
      return [] as R[]
    }

    await fn(capture) // collect

    const results = await sql.transaction(queries as any)
    return results as unknown as T
  },
}

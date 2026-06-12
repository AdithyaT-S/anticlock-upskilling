/**
 * src/lib/db/providers/pg.ts
 *
 * pg Pool provider — used for:
 *   DB_PROVIDER=local    Docker Postgres (no SSL)
 *   DB_PROVIDER=rds      AWS RDS (SSL required)
 *   DB_PROVIDER=railway  Railway Postgres (SSL required)
 *
 * RLS enforcement:
 *   Sets app.current_org_id and app.current_user_id as session
 *   variables before each query so our portable current_org_id()
 *   function (000_extensions.sql) picks them up.
 */

import { Pool, type PoolClient } from 'pg'
import type { DBProviderImpl, OrgContext } from '../types'

const provider = process.env.DB_PROVIDER ?? 'local'
const useSSL   = provider !== 'local'
const useRLS   = process.env.DB_USE_RLS !== 'false'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('[db/pg] Unexpected pool error:', err.message)
})

/** Set RLS session vars on a client before running a query */
async function setOrgContext(client: PoolClient, ctx: OrgContext) {
  if (!useRLS) return
  await client.query(
    `SELECT
       set_config('app.current_org_id',  $1, true),
       set_config('app.current_user_id', $2, true)`,
    [ctx.orgId, ctx.userId]
  )
}

export const pgProvider: DBProviderImpl = {

  async query<T>(
    sql: string,
    params: unknown[] = [],
    context?: OrgContext
  ): Promise<T[]> {
    const client = await pool.connect()
    try {
      if (context) await setOrgContext(client, context)
      const result = await client.query<T>(sql, params)
      return result.rows
    } finally {
      client.release()
    }
  },

  async transaction<T>(
    fn: (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
    context?: OrgContext
  ): Promise<T> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (context) await setOrgContext(client, context)

      const boundQuery = async <R>(sql: string, params: unknown[] = []) => {
        const result = await client.query<R>(sql, params)
        return result.rows
      }

      const result = await fn(boundQuery)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}

/** Exposed for health checks */
export async function pingDB(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

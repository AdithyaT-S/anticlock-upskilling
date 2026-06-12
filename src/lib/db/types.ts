export type DBProvider = 'local' | 'rds' | 'supabase' | 'neon' | 'railway'

export interface DBProviderImpl {
  query<T>(
    sql: string,
    params: unknown[],
    context?: OrgContext
  ): Promise<T[]>

  transaction<T>(
    fn: (q: <R>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
    context?: OrgContext
  ): Promise<T>
}

export interface OrgContext {
  orgId: string
  userId: string
}

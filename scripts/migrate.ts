#!/usr/bin/env tsx
/**
 * scripts/migrate.ts
 *
 * Single migration runner that works on every provider.
 *
 * Usage:
 *   npm run db:migrate              — apply pending migrations
 *   npm run db:migrate -- --reset   — drop + recreate + run all
 *   npm run db:migrate -- --dry-run — print SQL, don't execute
 *   npm run db:migrate -- --status  — show applied vs pending
 *
 * Set DB_PROVIDER and DATABASE_URL in .env before running.
 * Supabase cloud uses `supabase db push` instead (see below).
 */

import fs   from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { execSync } from 'child_process'

const provider = process.env.DB_PROVIDER ?? 'local'
const dryRun   = process.argv.includes('--dry-run')
const reset    = process.argv.includes('--reset')
const status   = process.argv.includes('--status')
const migrDir  = path.join(process.cwd(), 'supabase', 'migrations')

const COLORS = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
}

// ── Supabase: delegate to their CLI ─────────────────────────────
if (provider === 'supabase') {
  console.log(COLORS.bold('\nDB_PROVIDER=supabase — using Supabase CLI\n'))
  console.log('Run:  npx supabase link --project-ref <ref>')
  console.log('Then: npx supabase db push\n')
  console.log('Or in CI, the deploy.yml workflow does this automatically.')
  process.exit(0)
}

// ── All pg-compatible providers: local, rds, neon, railway ──────
const isSSL = provider !== 'local'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
  max: 1,
})

async function run() {
  const client = await pool.connect()
  console.log(COLORS.bold(`\nFreshCRM migrations [${provider}]\n`))

  try {
    // Create tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _crm_migrations (
        id          serial       PRIMARY KEY,
        filename    text         UNIQUE NOT NULL,
        provider    text         NOT NULL,
        applied_at  timestamptz  NOT NULL DEFAULT now(),
        duration_ms int
      );
    `)

    if (reset && !dryRun) {
      console.log(COLORS.yellow('⚠  --reset: dropping public schema...'))
      await client.query(`
        DROP SCHEMA   public CASCADE;
        CREATE SCHEMA public;
        CREATE TABLE _crm_migrations (
          id serial PRIMARY KEY,
          filename text UNIQUE NOT NULL,
          provider text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now(),
          duration_ms int
        );
      `)
    }

    // Read applied
    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM _crm_migrations ORDER BY filename'
    )
    const appliedSet = new Set(applied.map(r => r.filename))

    // Read migration files
    const files = fs.readdirSync(migrDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (status) {
      console.log('Migration status:\n')
      for (const f of files) {
        const mark = appliedSet.has(f)
          ? COLORS.green('  ✓ applied ')
          : COLORS.yellow('  ○ pending ')
        console.log(mark + f)
      }
      console.log()
      return
    }

    let count = 0
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(COLORS.dim(`  ✓ skip    ${file}`))
        continue
      }

      const sql     = fs.readFileSync(path.join(migrDir, file), 'utf8')
      const preview = sql.replace(/\s+/g, ' ').slice(0, 60)
      console.log(COLORS.yellow(`  → run     ${file}`))

      if (dryRun) {
        console.log(COLORS.dim(`            ${preview}...`))
        count++
        continue
      }

      const start = Date.now()
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO _crm_migrations (filename, provider, duration_ms) VALUES ($1,$2,$3)',
          [file, provider, Date.now() - start]
        )
        await client.query('COMMIT')
        count++
        console.log(COLORS.green(`  ✓ done    ${file} (${Date.now() - start}ms)`))
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(COLORS.red(`  ✗ FAILED  ${file}`))
        throw err
      }
    }

    if (count === 0) {
      console.log(COLORS.dim('  All up to date.\n'))
    } else {
      console.log(COLORS.green(`\n✓ ${dryRun ? 'Would apply' : 'Applied'} ${count} migration(s)\n`))
    }

  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => {
  console.error(COLORS.red('\n✗ Migration failed: ' + err.message))
  process.exit(1)
})

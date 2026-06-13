'use server'
import bcrypt from 'bcryptjs'
import { query, transaction } from '@/lib/db'
import { signupSchema } from '@/lib/validations/auth'

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

export async function signUp(input: unknown) {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { full_name, org_name, email, password } = parsed.data

  // BR-04: check duplicate email before hashing (cheap check first)
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [email]
  )
  if (existing.length > 0) {
    return { error: { email: ['An account with this email already exists'] } }
  }

  // BR-06: hash at cost factor 12
  const password_hash = await bcrypt.hash(password, 12)
  const slug = slugify(org_name)

  try {
    // BR-01: atomic — org + user in one transaction
    await transaction(async (q) => {
      const [org] = await q<{ id: string }>(
        'INSERT INTO orgs (name, slug) VALUES ($1, $2) RETURNING id',
        [org_name, slug]
      )
      await q(
        `INSERT INTO users (org_id, email, full_name, role, password_hash)
         VALUES ($1, $2, $3, 'admin', $4)`,
        [org.id, email, full_name, password_hash]   // BR-02: role always 'admin'
      )
    })
  } catch (err) {
    console.error('signUp transaction failed:', err)
    return { error: { _form: ['Account creation failed. Please try again.'] } }
  }

  return { success: true as const }
}

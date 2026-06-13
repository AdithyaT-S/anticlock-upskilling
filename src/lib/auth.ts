import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions, DefaultSession } from 'next-auth'
import { query } from '@/lib/db'
import { loginSchema } from '@/lib/validations/auth'

// ── Type augmentation ────────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      orgId: string
      role: 'admin' | 'member' | 'viewer'
    } & DefaultSession['user']
  }
  interface User {
    orgId: string
    role: 'admin' | 'member' | 'viewer'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    orgId: string
    role: 'admin' | 'member' | 'viewer'
  }
}

// ── NextAuth config ──────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const rows = await query<{
          id: string
          org_id: string
          email: string
          full_name: string
          role: 'admin' | 'member' | 'viewer'
          password_hash: string | null
        }>(
          'SELECT id, org_id, email, full_name, role, password_hash FROM users WHERE email = $1 LIMIT 1',
          [parsed.data.email]
        )

        const user = rows[0]
        if (!user?.password_hash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
        if (!valid) return null

        return {
          id:       user.id,
          email:    user.email,
          name:     user.full_name,
          orgId:    user.org_id,
          role:     user.role,
        }
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id    = user.id
        token.orgId = user.orgId
        token.role  = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id    = token.id
      session.user.orgId = token.orgId
      session.user.role  = token.role
      return session
    },
  },

  pages: {
    signIn: '/login',
  },
}

// ── Auth helper — use in every server action ─────────────────────
export async function getAuthUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id:    session.user.id,
    email: session.user.email!,
    orgId: session.user.orgId,
    role:  session.user.role,
  }
}

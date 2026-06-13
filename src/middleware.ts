import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  // Protect all routes except: login, signup, NextAuth API, Next.js internals, static assets
  matcher: [
    '/((?!login|signup|api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
}

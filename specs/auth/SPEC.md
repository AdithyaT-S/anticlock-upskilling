# SPEC: Authentication Module

## What This Module Does

Handles all identity and session management for FreshCRM. A user signs up, creates
an org, and gets a JWT with `org_id` embedded. Every subsequent request carries that
JWT — the DB layer reads `org_id` from it to enforce RLS automatically. Login/logout
refresh the session via Supabase Auth. Middleware protects all dashboard routes.

---

## Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login form | Public — redirect to `/dashboard` if already authed |
| `/signup` | Signup + org creation form | Public — redirect to `/dashboard` if already authed |
| `/auth/callback` | OAuth callback handler | Public |
| `/(dashboard)/*` | All app routes | Protected — redirect to `/login` if not authed |

---

## Pages & Components

### `/login/page.tsx`
- Email + password form
- "Remember me" checkbox
- Link to `/signup`
- On success: redirect to `/dashboard`
- On failure: show inline error toast ("Invalid email or password")
- No sidebar/topbar — uses `(auth)/layout.tsx` (centered card layout)

### `/signup/page.tsx`
- Fields: Full name, Email, Password, Org name
- On submit: create Supabase auth user → insert org → insert user row → redirect to `/dashboard`
- Link to `/login`

### `(auth)/layout.tsx`
- Centered card on gray-50 background
- FreshCRM logo at top
- No sidebar, no topbar

---

## Files to Create

```
src/app/(auth)/
├── SPEC.md                    ← this file
├── layout.tsx                 ← centered card layout
├── login/
│   └── page.tsx
├── signup/
│   └── page.tsx
└── callback/
    └── route.ts               ← Supabase OAuth callback handler

src/lib/supabase/
├── client.ts                  ← browser singleton
├── server.ts                  ← server client + getAuthUser()
└── middleware.ts              ← session refresh

src/middleware.ts               ← route protection (wraps supabase middleware)

src/lib/validations/
└── auth.ts                    ← Zod schemas for login + signup

src/lib/actions/
└── auth.ts                    ← signUp, signIn, signOut server actions
```

---

## Zod Schemas (`src/lib/validations/auth.ts`)

```typescript
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  org_name: z.string().min(2, 'Organisation name must be at least 2 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

---

## Server Actions (`src/lib/actions/auth.ts`)

### `signUp(input)`
1. Validate with `signupSchema`
2. Create Supabase auth user (`supabase.auth.signUp`)
3. Insert row into `orgs` table via `query()` (no org context yet — first insert)
4. Insert row into `users` table with `role: 'admin'`
5. Update JWT custom claims to include `org_id`
6. Redirect to `/dashboard`

### `signIn(input)`
1. Validate with `loginSchema`
2. `supabase.auth.signInWithPassword`
3. Redirect to `/dashboard`

### `signOut()`
1. `supabase.auth.signOut`
2. Redirect to `/login`

---

## `getAuthUser()` helper (`src/lib/supabase/server.ts`)

```typescript
export async function getAuthUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return {
    id: user.id,
    email: user.email!,
    orgId: user.user_metadata.org_id as string,
    role: user.user_metadata.role as 'admin' | 'member' | 'viewer',
  }
}
```

---

## Middleware (`src/middleware.ts`)

- Refresh session on every request
- Protect all routes under `/(dashboard)` — redirect to `/login` if no session
- Allow `/login`, `/signup`, `/auth/callback` without session
- Pass `org_id` through to request headers for server components

---

## Design Reference

Auth screens are not in the Stitch designs (no dedicated auth screen generated).
Use shadcn Card + Form components with this layout:
- Background: `bg-gray-50`
- Card: `max-w-md mx-auto mt-24 p-8`
- Primary button: `bg-indigo-600 hover:bg-indigo-700`
- Logo: Text "FreshCRM" in indigo-600, font-bold, text-2xl

---

## Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC1 | User signs up with valid details | Org + user created, redirected to `/dashboard` |
| AC2 | User signs up with existing email | Error toast: "Email already in use" |
| AC3 | User logs in with valid credentials | Session set, redirected to `/dashboard` |
| AC4 | User logs in with wrong password | Error toast: "Invalid email or password" |
| AC5 | Unauthenticated user visits `/dashboard` | Redirected to `/login` |
| AC6 | Authenticated user visits `/login` | Redirected to `/dashboard` |
| AC7 | User logs out | Session cleared, redirected to `/login` |
| AC8 | Session expires mid-session | Middleware refreshes token silently |

---

## Unit Tests (`__tests__/auth.unit.test.ts`)

- `loginSchema` — valid, missing email, invalid email format, short password
- `signupSchema` — valid, missing org name, short name
- `signIn` action — success, wrong password, unregistered email
- `signUp` action — success, duplicate email
- `getAuthUser` — returns user when session exists, returns null when not

## E2E Tests (`__tests__/auth.e2e.ts`)

- Full signup flow → lands on dashboard
- Login with valid credentials → lands on dashboard
- Login with wrong password → shows error
- Visit `/dashboard` when logged out → redirected to `/login`
- Logout → redirected to `/login`

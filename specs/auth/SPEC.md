# SPEC: Auth Module

## 1. What This Module Does

Handles all identity and session management for FreshCRM using NextAuth.js v4 with a credentials provider. A user signs up by submitting name, email, password, and org name — the server action hashes the password, creates the org row and user row in a single transaction, then signs the user in. Sessions are stored as encrypted JWTs in HTTP-only cookies (no DB session table needed). `getAuthUser()` reads the session server-side via `getServerSession`. Next.js middleware protects all dashboard routes, redirecting unauthenticated users to `/login` and authenticated users away from auth pages.

**Auth provider: NextAuth.js v4 — credentials only. No Supabase Auth. No OAuth in v1.**

---

## 2. Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login form | Public — redirect to `/dashboard` if already authenticated |
| `/signup` | Signup + org creation form | Public — redirect to `/dashboard` if already authenticated |
| `/api/auth/[...nextauth]` | NextAuth API handler | Public (NextAuth internals) |
| `/(dashboard)/*` | All app routes | Protected — redirect to `/login` if no valid session |

---

## 3. Pages & Components

### `src/app/(auth)/layout.tsx`
- Full-screen `bg-gray-50` background
- Vertically and horizontally centered
- No Sidebar, no TopBar
- FreshCRM wordmark in `text-indigo-600 font-bold text-2xl` above card

### `src/app/(auth)/login/page.tsx`
- shadcn `<Card>` — `max-w-md w-full mx-auto mt-24`
- Fields: Email (`type="email"`), Password (`type="password"`)
- Primary button: "Sign in" — full width, indigo
- Link below: "Don't have an account? Sign up" → `/signup`
- On success: redirect to `/dashboard`
- On error: Sonner toast — "Invalid email or password"
- Uses `LoginForm` client component

### `src/app/(auth)/signup/page.tsx`
- shadcn `<Card>` — `max-w-md w-full mx-auto mt-24`
- Fields: Full name, Organisation name, Email, Password
- Primary button: "Create account" — full width, indigo
- Link below: "Already have an account? Sign in" → `/login`
- On success: redirect to `/dashboard`
- On error: Sonner toast with specific message
- Uses `SignupForm` client component

---

## 4. Files to Create

```
src/lib/auth.ts                           ← NextAuth config + getAuthUser() helper
src/app/api/auth/[...nextauth]/route.ts   ← NextAuth GET + POST handler

src/lib/validations/auth.ts              ← loginSchema + signupSchema (Zod)
src/lib/actions/auth.ts                  ← signUp server action only
                                            (signIn/signOut via NextAuth client)

src/middleware.ts                        ← route protection via NextAuth middleware

src/app/(auth)/
├── layout.tsx                           ← centered card layout
├── login/
│   ├── page.tsx                         ← server component wrapper
│   └── LoginForm.tsx                    ← 'use client' form
└── signup/
    ├── page.tsx                         ← server component wrapper
    └── SignupForm.tsx                   ← 'use client' form

src/app/(dashboard)/
├── layout.tsx                           ← placeholder — replaced by Layout module
└── page.tsx                             ← redirects to /contacts (placeholder)
```

---

## 5. Zod Schemas

**File:** `src/lib/validations/auth.ts`

```
loginSchema:
  email       string  .email()            required  "Invalid email"
  password    string  .min(8)             required  "Password must be at least 8 characters"

signupSchema:
  full_name   string  .min(2).max(100)    required  "Name must be at least 2 characters"
  org_name    string  .min(2).max(100)    required  "Organisation name must be at least 2 characters"
  email       string  .email()            required  "Invalid email"
  password    string  .min(8).max(72)     required  "Password must be 8–72 characters"
```

Exported types: `LoginInput`, `SignupInput`

---

## 6. Server Actions & Auth Config

### `src/lib/auth.ts` — NextAuth config

```
authOptions:
  providers: [CredentialsProvider]
    authorize(credentials):
      1. Validate with loginSchema
      2. Query users table by email via query()
      3. Compare password hash with bcryptjs.compare()
      4. If match — return { id, email, name, orgId, role }
      5. If no match — return null (NextAuth shows error)

  session: { strategy: 'jwt' }

  callbacks:
    jwt({ token, user }):
      if user — embed orgId + role into token
      return token

    session({ session, token }):
      embed token.orgId + token.role into session.user
      return session

  pages:
    signIn: '/login'

getAuthUser():
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return { id, email, orgId, role }
```

### `src/lib/actions/auth.ts` — signUp only

```
signUp(input: unknown):
  1. Parse with signupSchema — return { error } if invalid
  2. Check if email already exists: query users table
  3. Hash password with bcryptjs.hash(password, 12)
  4. transaction():
     a. INSERT INTO orgs (name) RETURNING id
     b. INSERT INTO users (id, org_id, email, full_name, role, password_hash)
        role = 'admin' always (BR-02) — never from input
  5. Call signIn('credentials', { email, password, redirect: false })
  6. redirect('/dashboard')
```

Note: `signIn` and `signOut` are called client-side via `next-auth/react` — no server action needed.

---

## 7. User Stories

| # | Story |
|---|-------|
| US-01 | As an Org Admin, I want to sign up with my email and org name so that I can create a new CRM workspace for my team. |
| US-02 | As an Org Admin, I want to log in with my email and password so that I can access my CRM data securely. |
| US-03 | As any user, I want to log out so that I can secure my account on shared devices. |
| US-04 | As any user, I want to be redirected to login when I have no session so that I never see a broken dashboard. |
| US-05 | As an authenticated user visiting `/login`, I want to be redirected to `/dashboard` so that I don't log in twice. |

---

## 8. Acceptance Criteria

**AC-01 — Successful signup**
Given a new visitor is on `/signup`,
When they submit valid full name, org name, email, and password (8–72 chars),
Then an org row and user row are created, the user is signed in, and they are redirected to `/dashboard`.

**AC-02 — Duplicate email on signup**
Given a visitor is on `/signup`,
When they submit an email already registered,
Then they remain on `/signup` and see a toast: "An account with this email already exists".

**AC-03 — Signup with invalid fields**
Given a visitor is on `/signup`,
When they submit with any required field missing or password shorter than 8 chars,
Then inline field errors appear below each invalid input and the form is not submitted.

**AC-04 — Successful login**
Given a registered user is on `/login`,
When they submit their correct email and password,
Then a JWT session cookie is set and they are redirected to `/dashboard`.

**AC-05 — Wrong credentials**
Given a user is on `/login`,
When they submit wrong password or unregistered email,
Then they remain on `/login` and see a toast: "Invalid email or password".

**AC-06 — Unauthenticated dashboard access**
Given a visitor has no active session,
When they navigate to any `/dashboard/*` route,
Then they are redirected to `/login`.

**AC-07 — Authenticated auth page access**
Given a user has an active session,
When they navigate to `/login` or `/signup`,
Then they are redirected to `/dashboard`.

**AC-08 — Logout**
Given an authenticated user clicks "Sign out",
When `signOut()` from next-auth/react completes,
Then the session cookie is cleared and they land on `/login`.

**AC-09 — Session persists on refresh**
Given a logged-in user refreshes the page,
When the browser sends the JWT cookie,
Then they remain on the dashboard without being asked to log in again.

---

## 9. Permissions Matrix

| Action | Unauthenticated | Viewer | Member | Admin |
|--------|----------------|--------|--------|-------|
| View `/login` | ✅ | ↩ /dashboard | ↩ /dashboard | ↩ /dashboard |
| View `/signup` | ✅ | ↩ /dashboard | ↩ /dashboard | ↩ /dashboard |
| Sign up | ✅ | — | — | — |
| Sign in | ✅ | — | — | — |
| Sign out | — | ✅ | ✅ | ✅ |
| Access `/dashboard/*` | ↩ /login | ✅ | ✅ | ✅ |

---

## 10. Business Rules

**BR-01 — Atomic signup**
Org creation and user creation happen in a single DB transaction. If either insert fails, both are rolled back and the user sees an error.

**BR-02 — First user is always admin**
`role: 'admin'` is set server-side during signup. Never derived from client input.

**BR-03 — org_id never from client**
`org_id` is always read from the JWT session (`session.user.orgId`). Never from form input or query params.

**BR-04 — Generic login error**
Login failures (wrong password OR unregistered email) always return "Invalid email or password". Never distinguish which field is wrong — prevents user enumeration.

**BR-05 — Password constraints**
Passwords must be 8–72 characters. 72 is bcrypt's effective max — enforce at Zod layer to prevent silent truncation.

**BR-06 — Password hashing**
Passwords are hashed with `bcryptjs` at cost factor 12 before DB insert. Plain-text passwords are never stored.

---

## 11. Error Cases

| Trigger | User-facing message | Handling |
|---------|--------------------|----|
| Duplicate email on signup | "An account with this email already exists" | Check users table before insert |
| Wrong password or unknown email | "Invalid email or password" | Generic — BR-04 |
| DB error during signup transaction | "Account creation failed. Please try again." | Catch transaction error |
| Missing required field | Inline field error below input | Zod client-side via zodResolver |
| Password too short | "Password must be at least 8 characters" | Zod `.min(8)` |
| Password too long | "Password must be at most 72 characters" | Zod `.max(72)` — BR-05 |

---

## 12. Design Reference

No dedicated Stitch screen for Auth (confirmed — Stitch has no auth screen).

**Layout for both login and signup:**
- Background: `bg-gray-50` full screen, `min-h-screen flex items-center justify-center`
- Logo: `<span className="text-2xl font-bold text-indigo-600">FreshCRM</span>` — centered above card
- Card: shadcn `<Card>` — `w-full max-w-md p-8`
- Primary button: `className="w-full bg-indigo-600 hover:bg-indigo-700"`
- Error toasts: Sonner (`import { toast } from 'sonner'`)
- Font: Inter (inherited from root layout)

---

## 13. Unit Test Cases

**File:** `src/app/(auth)/__tests__/auth.unit.test.ts`

| Test | Maps to |
|------|---------|
| `loginSchema` accepts valid email + password ≥8 chars | AC-04 |
| `loginSchema` rejects missing email | AC-03 |
| `loginSchema` rejects invalid email format | AC-03 |
| `loginSchema` rejects password < 8 chars | AC-03 |
| `signupSchema` accepts all valid fields | AC-01 |
| `signupSchema` rejects missing full_name | AC-03 |
| `signupSchema` rejects missing org_name | AC-03 |
| `signupSchema` rejects password > 72 chars | BR-05 |
| `signUp` returns error when email already exists | AC-02 |
| `signUp` sets role='admin' regardless of input | BR-02 |
| `signUp` hashes password before insert | BR-06 |
| `signUp` uses a transaction for org + user inserts | BR-01 |
| `getAuthUser` returns user object when session exists | AC-07 |
| `getAuthUser` returns null when no session | AC-06 |

---

## 14. E2E Test Cases

**File:** `src/app/(auth)/__tests__/auth.e2e.ts`

| Test | Maps to |
|------|---------|
| Full signup flow → lands on `/dashboard` | AC-01 |
| Signup with duplicate email → shows toast | AC-02 |
| Login with valid credentials → lands on `/dashboard` | AC-04 |
| Login with wrong password → shows "Invalid email or password" | AC-05 |
| Visit `/dashboard` while logged out → redirected to `/login` | AC-06 |
| Visit `/login` while logged in → redirected to `/dashboard` | AC-07 |
| Sign out → lands on `/login`, session cleared | AC-08 |
| Refresh page while logged in → stays on dashboard | AC-09 |

# SPEC: Layout Shell
**Module:** Layout Shell (Sidebar + TopBar + Dashboard Layout)
**Branch:** `feat/layout`
**Depends on:** Auth (Module 1)
**Build order:** 2 of 11

---

## 1. What This Module Does

The Layout Shell is the persistent chrome that wraps every authenticated page in FreshCRM. It consists of a fixed left sidebar with primary navigation, a top bar showing the current user and search, and a responsive content area. The shell reads the logged-in user's name and role from the NextAuth session to personalise the topbar. No database queries are made in the layout — all data comes from the JWT session. The mobile nav drawer replaces the sidebar on small screens.

---

## 2. Routes

| Path | Layout applied | Access |
|------|---------------|--------|
| `/(dashboard)/*` | `src/app/(dashboard)/layout.tsx` | Authenticated only (middleware enforces) |

The layout itself has no route of its own. It wraps every page inside the `(dashboard)` route group.

---

## 3. Pages & Components

### `src/app/(dashboard)/layout.tsx`
Server Component. Reads session via `getServerSession(authOptions)`. Passes `user` prop to `Sidebar` and `TopBar`. Renders the three-column shell: sidebar (fixed, 240px) + main area (flex-1).

### `src/components/layout/Sidebar.tsx`
Client Component (needs `usePathname` for active state). Receives `user: { name, email, role }` as props.

**Sidebar sections:**
- **Logo** — "FreshCRM" wordmark in indigo-600, top of sidebar
- **Primary nav** (top group):
  - Dashboard → `/`
  - Contacts → `/contacts`
  - Leads → `/leads`
  - Deals → `/deals`
  - Tickets → `/tickets`
  - Activities → `/activities`
  - Reports → `/reports`
- **Bottom group**:
  - Settings → `/settings`
  - User display (name + role badge)
  - Sign out button (calls `signOut()` from next-auth/react)

**Active state:** nav item whose `href` matches `pathname` or `pathname.startsWith(href)` (except `/` which is exact match) gets `bg-indigo-50 text-indigo-600 font-medium`. Inactive items are `text-gray-600 hover:bg-gray-100`.

### `src/components/layout/TopBar.tsx`
Client Component. Receives `user: { name, email, role }`.

**Elements left → right:**
- Page title area (empty — each page sets its own `<h1>`)
- Search input (`SearchInput` placeholder — functional search added per module)
- Notification bell icon (static, no functionality in this module)
- User avatar (initials fallback if no image) + name + dropdown with Sign out

### `src/components/layout/MobileNav.tsx`
Client Component. Sheet/drawer (shadcn Sheet) triggered by hamburger icon in TopBar (visible on `md:hidden`). Contains same nav links as Sidebar.

---

## 4. Files to Create

```
src/
├── app/
│   └── (dashboard)/
│       └── layout.tsx              ← replace placeholder with full shell
├── components/
│   └── layout/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       └── MobileNav.tsx
```

No new files in `src/lib/` — layout reads only from session, no DB queries.

---

## 5. Zod Schemas

None. The layout shell has no forms and no user input requiring validation.

---

## 6. Server Actions

None. The layout only reads from the NextAuth session — no mutations.

The dashboard `layout.tsx` calls `getServerSession(authOptions)` to get the user, then redirects to `/login` if null (defence-in-depth — middleware already handles this).

```typescript
// src/app/(dashboard)/layout.tsx pattern
const session = await getServerSession(authOptions)
if (!session?.user) redirect('/login')
const user = { name: session.user.name!, email: session.user.email!, role: session.user.role }
```

---

## 7. User Stories

- US-01: As a Sales Rep, I want a persistent sidebar so that I can navigate between modules without losing my place.
- US-02: As any user, I want to see my name and role in the sidebar so that I know which account I'm logged into.
- US-03: As any user, I want the current section highlighted in the sidebar so that I always know where I am.
- US-04: As any user, I want a sign-out option accessible from the sidebar so that I can log out without navigating away.
- US-05: As a user on mobile, I want a collapsible nav drawer so that the layout works on small screens.

---

## 8. Acceptance Criteria

**AC-01 — Sidebar renders all nav items**
Given I am logged in and on any dashboard page,
When the page loads,
Then the sidebar shows: Dashboard, Contacts, Leads, Deals, Tickets, Activities, Reports, Settings — each with an icon and label.

**AC-02 — Active nav item is highlighted**
Given I am on the `/contacts` page,
When the sidebar renders,
Then the Contacts nav item has `bg-indigo-50 text-indigo-600` styling and all others do not.

**AC-03 — Root path active state is exact match**
Given I am on the `/` (dashboard) page,
When the sidebar renders,
Then only the Dashboard item is highlighted (not Contacts, not Leads).

**AC-04 — TopBar shows logged-in user's name**
Given I am logged in as "Alex Rivera",
When any dashboard page loads,
Then the TopBar displays "Alex Rivera" (from session).

**AC-05 — Sign out from sidebar works**
Given I am logged in,
When I click the Sign out button in the sidebar,
Then I am redirected to `/login` and my session is cleared.

**AC-06 — Unauthenticated access is blocked**
Given I am not logged in,
When I navigate to any `/contacts`, `/deals`, or other dashboard URL,
Then I am redirected to `/login` (handled by middleware + layout defence).

**AC-07 — Mobile nav drawer opens and closes**
Given I am on a viewport narrower than 768px,
When I click the hamburger icon in the TopBar,
Then a nav drawer slides in showing all nav links; clicking a link closes the drawer.

**AC-08 — Sub-path active state**
Given I am on `/contacts/123`,
When the sidebar renders,
Then the Contacts nav item is highlighted (startsWith match).

---

## 9. Permissions Matrix

Layout is the same for all roles — all authenticated users see identical navigation. Role-specific visibility (e.g. hiding Settings for Viewers) is enforced inside each module's pages, not in the layout.

| Action | Admin | Member | Viewer |
|--------|-------|--------|--------|
| View sidebar + topbar | ✅ | ✅ | ✅ |
| All nav links visible | ✅ | ✅ | ✅ |
| Sign out | ✅ | ✅ | ✅ |

---

## 10. Business Rules

**BR-01 — Session-only data in layout**
The layout must never make a database query. User name, email, and role come exclusively from the NextAuth JWT session via `getServerSession`.

**BR-02 — Defence-in-depth redirect**
Even though middleware already redirects unauthenticated users, the dashboard layout must independently call `getServerSession` and redirect to `/login` if the session is null.

**BR-03 — Exact match for root nav item**
The Dashboard nav item (`href="/"`) uses exact pathname match only. `pathname === '/'` — not `pathname.startsWith('/')`.

**BR-04 — No DB calls, no server actions in layout**
Layout components are pure shell — they receive user data as props from the server layout, never fetch independently.

**BR-05 — Sign out clears session client-side**
Sign out calls `signOut({ callbackUrl: '/login' })` from `next-auth/react` — never a custom server action.

---

## 11. Error Cases

| Case | Handling |
|------|---------|
| Session missing in layout | `redirect('/login')` |
| User name is null/empty | Display email as fallback in TopBar and avatar initials |
| Navigation to unknown route | Next.js 404 — layout still renders correctly around the error |

---

## 12. Design Reference

**Stitch screen:** CRM Sales Dashboard (`e960e51133dd4a189eec69ab8a3c317c`)
**Project:** Indigo B2B CRM Dashboard (`10851584638320860726`)

From the screen:
- Sidebar: white background, 240px wide, fixed height, `border-r border-gray-200`
- Logo: `text-indigo-600 font-bold text-xl` "FreshCRM" at top with 24px padding
- Nav items: `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm`, Lucide icons at 18px
- Active item: `bg-indigo-50 text-indigo-600 font-medium`
- Inactive item: `text-gray-600 hover:bg-gray-100`
- TopBar: white, `border-b border-gray-200`, `h-16`, `px-6`, flex row with space-between
- User avatar: circle initials, `bg-indigo-100 text-indigo-600`, 32px
- Main content: `bg-gray-50 flex-1 overflow-auto`
- Icons: Lucide React — LayoutDashboard, Users, TrendingUp, Briefcase, Ticket, Activity, BarChart2, Settings, Bell, Menu, LogOut

---

## 13. Unit Test Cases

Tests live at `src/components/layout/__tests__/layout.unit.test.tsx`

| Test | Maps to |
|------|---------|
| Sidebar renders all 8 nav items | AC-01 |
| Active class applied to matching nav item | AC-02 |
| Root path `/` only highlights Dashboard (not others) | AC-03 |
| TopBar displays user name from props | AC-04 |
| Sub-path `/contacts/123` highlights Contacts | AC-08 |
| BR-03: startsWith used for non-root, exact for root | BR-03 |

Mock `usePathname` from `next/navigation` in all tests.

---

## 14. E2E Test Cases

Tests live at `src/components/layout/__tests__/layout.e2e.ts`

| Test | Maps to |
|------|---------|
| Login → sidebar visible with all nav items | AC-01 |
| Click Contacts in sidebar → navigates to `/contacts` | AC-01 |
| `/contacts` → Contacts nav item highlighted | AC-02 |
| `/` → only Dashboard highlighted | AC-03 |
| TopBar shows logged-in user name | AC-04 |
| Click Sign out → session cleared, redirected to `/login` | AC-05 |
| Visit `/contacts` logged out → redirected to `/login` | AC-06 |
